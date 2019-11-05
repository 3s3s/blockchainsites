'use strict';

const utils = require("./utils");
const io = require('socket.io-client');
const blockchaindata = require('blockchaindata-lib');
const $ = require('jquery');
const Peer = require('simple-peer');
const ipcRender = electron.ipcRenderer;

const url = 'http://144.76.71.116:3000/';

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
    let connect = connectionToFull();

    $('#peer_status').addClass('badge-danger');
    $('#peer_status').html('No connection to socket-server');

    //connection constructor
    function connectionToFull() {

      let obj = {};

      const socket = io.connect(url, {
        reconnect: false
      });

      //connection state logs
      const timer = setInterval(function () {
        console.log('connect to server: ' + socket.connected);
        if(socket.connected) {
          $('#peer_status').removeClass('badge-primary');
          $('#peer_status').removeClass('badge-danger');
          $('#peer_status').addClass('badge-warning');
          $('#peer_status').html('Connect to socket-server');
        }
        else {
          $('#peer_status').removeClass('badge-primary');
          $('#peer_status').removeClass('badge-danger');
          $('#peer_status').addClass('badge-warning');
          $('#peer_status').html('Connecting to socket-server...');
        }

      }, 2000);

      const lowNode = new Peer({
        initiator: true,
        trickle: false
      });

      const pc = lowNode._pc;
      obj.peer = pc
      obj.Peer = lowNode;
      pc.onconnectionstatechange = connectionState;

      lowNode.on('signal', (offer) => {
        socket.emit('offer', offer);
        console.log('offer has been sent');
      });

      socket.on('answer', (answer) => {
        lowNode.signal(answer);
        console.log('answer has been received');
        socket.disconnect();
        clearInterval(timer);
        $('#peer_status').html('host connection: connected');
        $('#peer_status').addClass('badge-primary');
        $('#peer_status').removeClass('badge-warning');
        $('#peer_status').removeClass('badge-danger');
      });

      socket.on('disconnect', () => {
        setTimeout(function () {
          if(connect.peer.connectionState != 'connected') {
            lowNode.destroy();
            connect = connectionToFull();
            browser.getSrc = getSrc;
            console.log('reconnect');
            clearInterval(timer);
          }
        }, 10000);
      });

        getSrc = async function(url) {
        return new Promise(ok => {
            if(connect.peer.connectionState == 'connected') {
              connect.Peer._channel.send(url);
              connect.Peer._channel.onmessage = e => {
                ok(e.data);
              }
            }
        });
      }

      function connectionState() {
        console.log(connect.peer.connectionState);
        if(connect.peer.connectionState == 'closed' || connect.peer.connectionState == 'disconnected' || connect.peer.connectionState == 'failed') {
          $('#peer_status').removeClass('badge-warning');
          $('#peer_status').removeClass('badge-primary');
          $('#peer_status').addClass('badge-danger');
          $('#peer_status').html('host disconnected');
          connect = connectionToFull();
          console.log('reconnect');
          browser.getSrc = getSrc;
        }
      }
      return obj;
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
