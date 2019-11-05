'use strict'

const utils = require('./utils.js')
const io = require('socket.io-client');
const blockchaindata = require('blockchaindata-lib');
const $ = require('jquery');
const Peer = require('simple-peer');

const url = 'http://144.76.71.116:3000/';
const MAX_PEER_CONNECTIONS = 10;

console.log('I`m full');

  let connections = [];

  setInterval(function () {
    connections.forEach(item => {
      console.log(item.peer.connectionState);
    });
  }, 2000);

  $('#peer_status').html('Connected peers: ' + connections.length);
  $('#statusbar').css('display', 'block');

  //new connection to socket-server
  let server = serverConnect();

  //connection state logs
  const timer = setInterval(function () {
    console.log('connect to server: ' + server.socket.connected);
  }, 2000);

  //socket-server connection constructor
  function serverConnect() {
    let obj = {};

    const socket = io.connect(url, {
      reconnect: false
    });
    obj.socket = socket;

    socket.emit('full-node');
    socket.on('offer', (offer, id) => {
      console.log('offer is received');
      connections.push(lowPeer(socket, offer, id));
      console.log('connections count: ' + connections.length);
      $('#peer_status').html('Connected peers: ' + connections.length);
    });

    //reconnecting to server
    socket.on('disconnect', () => {
      if(connections.length < MAX_PEER_CONNECTIONS) {
        console.log('reconnect');
        socket.disconnect();
        server = serverConnect();
      }
    });
    return obj;
  }

  //p2p constructor
  function lowPeer(socket, offer, id) {

    let obj = {};

    const fullNode = new Peer({
      initiator: false,
      trickle: false
    });

    const pc = fullNode._pc;
    obj.peer = pc;

    fullNode.signal(offer);

    fullNode.on('signal', (answer) => {
      socket.emit('answer', answer, id);
      console.log('answer has been sent');
      if(connections.length > (MAX_PEER_CONNECTIONS - 1)) {
        socket.removeAllListeners();
        socket.disconnect();
      }
    });

    //callback function
    pc.onconnectionstatechange = connectionState;
    pc.ondatachannel = dataChannel;

    function connectionState(e) {
      const peer = e.target;
      if(peer.connectionState == 'closed' || peer.connectionState == 'disconnected' || peer.connectionState == 'failed') {
        connections.forEach((item, i) => {
          if(item.peer == e.target) {
            connections.splice(i, 1);
            return;
          }
        });
        checkConnections();
      }
      console.log(connections);
      $('#peer_status').html('Connected peers: ' + connections.length);
    }

    function dataChannel(event) {
      const receiveChannel = event.channel;
      receiveChannel.onmessage = async(e) => {
        let url = e.data.toString();
        const ret = await blockchaindata.GetObjectFromBlockchain(url.substr(7));
        url = "data:text/html;base64," + ret.base64;
        receiveChannel.send(url);
      }
    }
    return obj;
  }

  function checkConnections() {
    if((connections.length < MAX_PEER_CONNECTIONS) && !(server.socket.connected)) {
      server = serverConnect();
    }
  }
