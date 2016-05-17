const ipc = require('electron').ipcRenderer
const dialog = require('electron').remote.dialog
const clipboard = require('electron').clipboard
const fs = require('fs')
const path = require('path')
const ytdl = require('youtube-dl')

const dlForm = document.querySelector('form.dl')

const fieldURL = dlForm.elements.namedItem('url')
const buttonURLPaste = dlForm.elements.namedItem('url-paste')

const isPlaylistCheckbox = dlForm.elements.namedItem('is-playlist')

const fieldDir = dlForm.elements.namedItem('dir')
const buttonDir = dlForm.elements.namedItem('dir-select')

const progressBar = document.querySelector('progress')
const outField = document.querySelector('output')

/**
 * Paste URL
 */
buttonURLPaste.addEventListener('click', () => {
  fieldURL.value = clipboard.readText()
})

/**
 * Choose a directory dialog
 */
buttonDir.addEventListener('click', () => {
  dialog.showOpenDialog({ properties: [ 'openDirectory' ] }, (path) => {
    if (path) {
      fieldDir.value = path
    }
  })
})

/**
 * Download with current parameters
 */
dlForm.addEventListener('submit', (event) => {
  event.preventDefault()
  
  const url = fieldURL.value
  const parameters = []
  
  //parameters.push( '--' + (isPlaylistCheckbox.checked ? 'yes' : 'no') + '-playlist' )
  console.log(parameters)
  
  download(url, parameters)
  
  return false
})

function download(url, parameters) {
  const video = ytdl(url, parameters, { cwd: fieldDir.value })
  let info
  let size = 0
  let pos = 0
  
  outField.innerHTML = "..."
  outField.classList.remove('ended')
  outField.classList.remove('err')

  video.on('error', (err) => {
    outField.classList.add('err')
    outField.innerHTML = err
    console.log(err)
  })
  
  video.on('info', (_info) => {
    info = _info
    
    console.log(info)
    size = info.size
    let output = path.join(path.join(fieldDir.value, info._filename))
    video.pipe(fs.createWriteStream(output))
  })

  video.on('data', (chunk) => {
    pos += chunk.length
    
    if (size) {
      let percent = (pos / size * 100).toFixed(2)
      progressBar.value = percent.toString()
      outField.innerHTML = `${percent}%`
    }
  })

  video.on('next', (url) => {
    console.log(url)
    download(url, parameters)
  })

  video.on('end', () => {
    outField.classList.add('ended')
    outField.innerHTML = `${info._filename}`
  })
}