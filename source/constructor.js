'use strict'

// const {ipcRender} = electron;
const ipcRender = electron.ipcRenderer;
const utils = require('./utils.js');
const blockchaindata = require('blockchaindata-lib');

$(document).ready(function() {

  //Creating codeeditor
  $('#codeeditor').summernote({
    toolbar: [
      ['style', ['bold', 'italic', 'underline', 'clear']],
      ['font', ['strikethrough', 'superscript', 'subscript']],
      ['fontsize', ['fontname', 'fontsize']],
      ['color', ['color', 'bac']],
      ['para', ['ul', 'ol', 'style', 'paragraph']],
      ['height', ['height']],
      ['insert', ['picture', 'link', 'table', 'hr']],
      ['view', ['fullscreen', 'codeview']]
    ],
    fontNames: [
      'Arial',
      'Courier New',
    ],
    minHeight: 150,
    height: 200,
    focus: true,
    callbacks: {
      onChange: change
    },
    codemirror: {
      mode: "text/html",
      lineNumbers: true,
      matchBrackets: true,
      theme: "eclipse",
      extraKeys: {"Ctrl-Space": "autocomplete"},
      autocorrect: true,
      spellcheck: true
  }
  });

  async function change() {
    let data = $('#codeeditor').summernote('code');
    data = await utils.trimHTML(data);
    $('#pageSize').html(Math.ceil(data.length / 2));
  }

  //Button for creating new page
  $('#createBtn').click((event) => {
    event.preventDefault();
    $('#constructorQuestion').remove();
    $('#codContainer').show();
    $('#constructorTable').show();
  });

  //Button for editing existing page
  $('.openBtn').click((event) => {
    event.preventDefault();
    $('#constructorQuestion').remove();
    $('#codContainer').show();
    $('#constructorTable').show();
    //Code for opening htmlfile
    ipcRender.send('openBtn');
  });

  //Button for local saving page
  $('#saveBtn').click((event) => {
    event.preventDefault();
    ipcRender.send('saveBtn', $('#codeeditor').summernote('code'));
  });

  //Communication to main process
  ipcRender.on('openReply', async (event, html) => {
    $('#codeeditor').summernote('code', html);
  });

  //Button for loading the page to Blockchain
  $('#loadBtn').click((e) => {
    e.preventDefault();
    ipcRender.send('openForLoading');
  });

  //Sending rawTx with data (page) to BlockChain
  ipcRender.on('loadReply', async (event, html) => {
    const ret = await blockchaindata.SaveTextToBlockchain(html);

    if (ret.result == true)
      alert('saved! txid='+ret.txid);
    else
      alert(ret.message);
    //const trimHTML = await utils.trimHTML(html);
    //code for saving data
    // const rawTx = await utils.txBuild(trimHTML, privateKey, input, nOut); // Set privateKey, input and nOut
    // const txWithPage = await utils.broadcast(rawTx);
    // const unspentTX = await utils.joinOutputs(txWithPage.result);
    //console.log(trimHTML); //debugging
  });


});
