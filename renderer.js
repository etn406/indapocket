const ipcRenderer = require('electron').ipcRenderer
const dialog = require('electron').remote.dialog
const clipboard = require('electron').clipboard

const fs = require('fs')
const path = require('path')
const ytdl = require('youtube-dl')

const Indapocket = require('./indapocket')
const indapocket = new Indapocket
