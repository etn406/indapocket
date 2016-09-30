const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = require('electron').ipcMain

require('electron-reload')(__dirname)

let window

/**
 * L'application est prête à être lancée.
 */
app.on('ready', () => {

    window = new BrowserWindow({
        title: app.getName(),
        width: 800,
        height: 660,
        useContentSize: true,
        resizable: true,
        fullscreenable: false,
        autoHideMenuBar: true
    })

    window.loadURL(`file://${__dirname}/index.html`)

    window.webContents.openDevTools()

    window.on('closed', () => app.quit())

})

/**
 * Détecter l'évènement de focus de la fenêtre par l'utilisateur
 */
app.on('browser-window-focus', (event) => {

    window.webContents.send('window-focus')

})

/**
 * Retourne le répertoire de téléchargement par défaut au script de rendu
 */
ipcMain.on('get-user-downloads-path', (event, arg) => {

    event.sender.send('user-downloads-path', app.getPath('downloads'))

})