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
  $('#loadBtn').click(async (e) => {
    e.preventDefault();
    const pageData = $('#codeeditor').summernote('code');
    if(pageData) {
      const ret = await blockchaindata.SaveTextToBlockchain(pageData);
      if (ret.result) {
        console.log(ret.txid);
        ipcRender.send('dataTx', ret.txid);
      }
    }
  });
});

ipcRender.on('txArr', (event, txArr) => {
  $('#mySitesCount').html(txArr.length);
  $('#pageTx').html('');
  txArr.forEach(item => {
    $('#pageTx').prepend(`<li class="list-group-item">tbtc://${item}</li>`);
  });
});
