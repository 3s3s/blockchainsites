'use strict';

const utils = require("./utils");
const io = require('socket.io-client');
const blockchaindata = require('blockchaindata-lib');
const $ = require('jquery');
const ipcRender = electron.ipcRenderer;

// const url = 'https://desolate-brook-88028.herokuapp.com';
const url = 'http://144.76.71.116:3000/';
// const url = 'http://127.0.0.1:3000/';

(async () => {
  let status = await utils.nodeStatus();

  let getSrc;

  if(status.blockchain && !status.pruned) {
    const p2p = require('./p2p.js');

    getSrc = function(url) {
      return new Promise(async ok => {
        const ret = await blockchaindata.GetObjectFromBlockchain(url.substr(7));
        url = "data:text/html;base64," + ret.base64;
        ok(url);
      });
    }

    $('#mode_status').html('Node status: full-node');
    $('#statusbar').css('display', 'block');
  }
  else {
    console.log('I`m low');


    if(!status.blockchain) {
      $('#constructorTab').remove();
      $('#itemConstructor').remove();
      $('#mode_status').html('Node status: no-node');
      $('#mode_status').removeClass('badge-primary');
      $('#mode_status').addClass('badge-danger');

      $('#showtoolstab').attr('disabled', '');
      $('#showtoolslabel').append('(disabled for no-node)');
    }
    else {
      $('#mode_status').html('Node status: pruned-node');
      $('#mode_status').removeClass('badge-primary');
      $('#mode_status').addClass('badge-warning');
    }

    $('#statusbar').css('display', 'block');
    //connect to full-node
    let connect = new connectionToFull();

    $('#peer_status').addClass('badge-danger');
    $('#peer_status').html('No connection to socket-server');

    // setInterval(function () {
    //   console.log(connect.peer.connectionState);
    // }, 3000);

    //connection constructor
    function connectionToFull() {

      const socket = io.connect(url, {
        reconnect: true
      });

      //connection state logs
      const timer = setInterval(function () {
        console.log('connect to server: ' + socket.connected);
      }, 2000);

      const lowNode = new RTCPeerConnection();
      this.peer = lowNode;
      const sendChannel = lowNode.createDataChannel('sendChannel');

      lowNode.onicecandidate = iceCandidate;
      lowNode.onconnectionstatechange  = connectionState;

      let localOffer;

      lowNode.createOffer()
      .then(offer => {
        lowNode.setLocalDescription(offer);
      })
      .then(() => {
        localOffer = lowNode.localDescription;
      });

      socket.on('answer', (answer, candidate) => {
        console.log('answer is received');
        lowNode.setRemoteDescription(answer)
        .then(() => lowNode.addIceCandidate(candidate));
        // console.log('set remote');
        socket.disconnect();
        clearInterval(timer);
        $('#peer_status').html('host connection: connected');
        $('#peer_status').addClass('badge-primary');
        $('#peer_status').removeClass('badge-warning');
        $('#peer_status').removeClass('badge-danger');
      });

        getSrc = async function(url) {
        return new Promise(ok => {
            if(lowNode.connectionState == 'connected') {
              sendChannel.send(url);
              sendChannel.onmessage = e => {
                ok(e.data);
              }
            }
        });
      }

      let state = false;
      function connectionState() {
        console.log(lowNode.connectionState);
        if (lowNode.connectionState == 'connecting') {
          setTimeout(function () {
            if (!state) {
              socket.disconnect();
              lowNode.close();
              connect = new connectionToFull();
            }
          }, 3000);
        }
        if (lowNode.connectionState == 'connected') {
          state = true;
        }
        if(lowNode.connectionState == 'closed' || lowNode.connectionState == 'disconnected' || lowNode.connectionState == 'failed') {
          connect.peer.close();
          connect = new connectionToFull();
          browser.getSrc = getSrc;
        }
      }

      let offerSent = 0;
      let candidate;
      let complete = false;

      function iceCandidate(e) {
        if(e.candidate) {
          if(e.candidate.protocol == 'udp') {
            candidate = e.candidate;
            offerSent++
            setTimeout(() => {
              if (offerSent == 1 && !complete) {
                socket.emit('offer', localOffer, candidate);
                console.log('offer has been sent');
                complete = true;
              }
              else if (offerSent == 2 && !complete) {
                socket.emit('offer', localOffer, candidate);
                console.log('offer has been sent');
                complete = true;
              }
              $('#peer_status').html('Connected to socket-server');
              $('#peer_status').addClass('badge-warning');
              $('#peer_status').removeClass('badge-primary');
              $('#peer_status').removeClass('badge-danger');
            }, 300);
          }
        }
      }

    }
  }

  const browser = new navigation({
    defaultFavicons: true,
    getSrc: getSrc,
  });

  $(document).ready(function() {
    ipcRender.send('page-loaded');
  });

  ipcRender.on('oldBookmarks', (event, oldBookmarks) => {
    browser.bookmarks = oldBookmarks;
  });

  ipcRender.on('getJsonBookmarks', () => {
    const json = browser.getBookmarks();
    ipcRender.send('JsonBookmarks', JSON.stringify(json));
  });

})()
