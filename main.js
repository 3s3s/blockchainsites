'use strict'

const path = require('path');
const url = require('url');
const fs = require('fs');
const {app, BrowserWindow, dialog, ipcMain} = require('electron');

const utils = require('./source/utils.js');
const constants = require('./source/constants.js');

let window;

//Window options
function createWindow() {
  window = new BrowserWindow({
    width: 1000,
    height: 800,
    icon : __dirname + '/source/img/icon.png',
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true
    },
   // frame: false          //after debugging
  });

  window.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file',
    slashes: true
  }));

  window.webContents.openDevTools();   //after debugging

  window.on('closed', () => {
    window = null;
  });

  window.once('close', saveBookmarks);
}

function saveBookmarks(event) {
  event.preventDefault();
  window.webContents.send('getJsonBookmarks');
}

//Start application
app.on('ready', createWindow);

//Close application
app.on('window-all-closed', () => {
  app.quit();
});

//Read html from file to edit
ipcMain.on('openBtn', (event) => {

  dialog.showOpenDialog(constants.ipcOpen, async (filePath) => {
    const html = await utils.openHTML(filePath[0]);
    event.sender.send('openReply', html);
  });

});

//Save local page
ipcMain.on('saveBtn', (event, page) => {

  dialog.showSaveDialog(constants.ipcSave, async (fileName) => {
    await utils.saveLocal(page, fileName);
  });

});

//Read html from file to load
ipcMain.on('openForLoading', (event) => {

  dialog.showOpenDialog(constants.ipcSave, async (filePath) => {
    const html = await utils.openHTML(filePath[0]);
    event.sender.send('loadReply', html);
  })

});

//Available memory
ipcMain.on('getbalance', async (event) => {
  const balance = await utils.getbalance();
  event.sender.send('balance', balance.result);
});

//Load bookmarks
ipcMain.on('page-loaded', () => {
  fs.readFile('bookmarks.json', 'utf8', (err, data) => {
    if(err) data = '{}';
    window.webContents.send('oldBookmarks', JSON.parse(data));
  });
});

ipcMain.on('JsonBookmarks', (event, newBookmarks) => {
  fs.writeFile("bookmarks.json", newBookmarks, () => {
    window.close();
  });
});
