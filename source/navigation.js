'use strict';

const utils = require("./utils");
const io = require('socket.io-client');
const ipcRender = electron.ipcRenderer;

const url = 'https://desolate-brook-88028.herokuapp.com';
// const url = 'http://127.0.0.1:3000/';

(async () => {
  let status = await utils.isFullNode();

  let getSrc;

  if(status) {
    const p2p = require('./p2p.js');

    getSrc = function(url) {
      return new Promise(async ok => {
        const ret = await utils.GetPageFromBlockchain(url.substr(7), 'tBTC');
        url = "data:text/html;base64," + ret;
        ok(url);
      });
    }
  }
  else {
    console.log('I`m low');

    //connect to full-node
    let connect = new connectionToFull();

    // setInterval(function () {
    //   console.log(connect.peer.connectionState);
    // }, 3000);

    //connection constructor
    function connectionToFull() {

      const socket = io.connect(url, {
        reconnect: true
      });

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
        lowNode.setRemoteDescription(answer)
        .then(() => lowNode.addIceCandidate(candidate));
        // console.log('set remote');
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

      function connectionState() {
        if(lowNode.connectionState == 'closed' || lowNode.connectionState == 'disconnected' || lowNode.connectionState == 'failed') {
          connect.peer.close();
          connect = new connectionToFull();
          browser.getSrc = getSrc;
        }
      }

      function iceCandidate(e) {
        // console.log(e.candidate);
        if(e.candidate) {
          if(e.candidate.protocol == 'udp') {
            socket.emit('offer', localOffer, e.candidate);
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
