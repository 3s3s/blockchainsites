'use strict';

//browserify --debug index.js > ../js/index.js

const utils = require("./utils");
const tools = require("./tools");
const constructor = require("./constructor");
const constants = require('./constants.js');
const $ = require('jquery');
const nav = require("./navigation.js");
// const p2p = require('./p2p.js')

const shell = electron.shell;
const clipboard = electron.clipboard;
const ipcRender = electron.ipcRenderer;

$("#getLink").click((e) => {
  e.preventDefault();
  shell.openExternal(constants.getMemory.faucet);
});

$(".copyAddress").click(async (e) => {
  e.preventDefault();
  const address = await utils.getnewaddress();
  clipboard.writeText(address.result);
});

ipcRender.on('balance', async (event, balance) => {
  $('.availableMemory').html(Math.floor(balance * 1E8 / constants.tx.FEE_FOR_BYTE));
});
