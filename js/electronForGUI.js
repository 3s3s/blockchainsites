//Load electron to the page
const electron = require('electron');
const navigation = require('electron-navigation2');
window.nodeRequire = require;
delete window.require;
delete window.exports;
delete window.module;
//Else other libs will be crashed
