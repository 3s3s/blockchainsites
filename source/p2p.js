'use strict'

const utils = require('./utils.js')
const io = require('socket.io-client');
const blockchaindata = require('blockchaindata-lib');
const $ = require('jquery');

// const url = 'https://desolate-brook-88028.herokuapp.com';
const url = 'http://144.76.71.116:3000/';
// const url = 'http://127.0.0.1:3000/';
const MAX_PEER_CONNECTIONS = 10;

console.log('I`m full');

  let connections = [];
  let localAnswer;
  let targetID;

  setInterval(function () {
    connections.forEach(item => {
      console.log(item.peer.connectionState);
    });
  }, 2000);

  $('#peer_status').html('Connected peers: ' + connections.length);
  $('#statusbar').css('display', 'block');
  // setInterval(function () {
  //   connections.forEach(item => {
  //     console.log(item.peer.connectionState);
  //   });
  // }, 3000);

  //connection status to socket-server
  let connectStatus;

  //new connection to socket-server
  let server = new serverConnect();

  //connection state logs
  const timer = setInterval(function () {
    console.log('connect to server: ' + server.socket.connected);
  }, 2000);

  //socket-server connection constructor
  function serverConnect() {
    const socket = io.connect(url, {
      reconnect: false
    });
    connectStatus = true;
    socket.emit('full-node');
    socket.on('offer', (offer, candidate, id) => {
      console.log('offer is received');
      connections.push(new lowPeer(socket, offer, candidate, id));
      console.log(connections);
      $('#peer_status').html('Connected peers: ' + connections.length);
    });
    this.socket = socket;

    //reconnecting to server
    socket.on('disconnect', () => {
      if(connections.length < MAX_PEER_CONNECTIONS) {
        console.log('reconnect');
        socket.disconnect();
        server = new serverConnect();
      }
    });


  }

  //p2p constructor
  function lowPeer(socket, offer, candidate, id) {

    const iceServers = {
    	iceServers: [
        {url:'stun:stun.l.google.com:19302'},
        {url:'stun:stun1.l.google.com:19302'},
        {url:'stun:stun2.l.google.com:19302'},
        {url:'stun:stun3.l.google.com:19302'},
        {url:'stun:stun4.l.google.com:19302'},
        {url:'stun:stun.ekiga.net'},
        {url:'stun:stun.ideasip.com'},
        {url:'stun:stun.schlund.de'},
        {url:'stun:stun.voiparound.com'},
        {url:'stun:stun.voipbuster.com'},
        {url:'stun:stun.voipstunt.com'},
        {url:'stun:stun.xten.com'},
        {
          url: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
        }
    	]
    }

    const fullNode = new RTCPeerConnection(iceServers);

    //callback function
    fullNode.ondatachannel = dataChannel;
    fullNode.onconnectionstatechange  = connectionState;

    let candidates = {
      ice: []
    }

    fullNode.onicecandidate = function(e) {
      if (e.candidate) {
        console.log('get candidate');
        candidates.ice.push(e.candidate);
        socket.emit('answer', localAnswer, candidates, targetID);
        console.log('answer and candidates have sent');
        if(connections.length > (MAX_PEER_CONNECTIONS - 1)) {
          socket.removeAllListeners();
          socket.disconnect();
          connectStatus = false;
        }
      }
    }

    fullNode.setRemoteDescription(offer)
    .then(() => fullNode.createAnswer())
    .then(answer => fullNode.setLocalDescription(answer))
    .then(() => {
      candidate.ice.forEach(item => {
        fullNode.addIceCandidate(item);
      });
      localAnswer = fullNode.localDescription;
      targetID = id;
    });
    this.peer = fullNode;
  }

  //getting data
  function dataChannel(event) {
    const receiveChannel = event.channel;
    receiveChannel.onmessage = async (e) => {
      let url = e.data.toString();
      const ret = await blockchaindata.GetObjectFromBlockchain(url.substr(7));
      url = "data:text/html;base64," + ret.base64;
      receiveChannel.send(url);
    }
  }

  //clean disconnected
  function connectionState(e) {
    const peer = e.target
    if(peer.connectionState == 'closed' || peer.connectionState == 'disconnected' || peer.connectionState == 'failed' ) {
      connections.forEach((item, i) => {
        if(item.peer == e.target) {
          item.peer.close();
          connections.splice(i, 1);
          return;
        }
      });
      checkConnections();
    }
    console.log(connections);
    $('#peer_status').html('Connected peers: ' + connections.length);
  }

  //reconnect socket-server
  function checkConnections() {
    if(!connectStatus && (connections.length < MAX_PEER_CONNECTIONS)) {
      server = new serverConnect();
    }
  }
