const fs = require('fs')
const path = require('path')
const dialog = require('electron').remote.dialog
const clipboard = require('electron').clipboard
const ipc = require('electron').ipcRenderer
const ytdl = require('youtube-dl')
const urlutil = require('url')

const NOTHING = 'nothing'
const DOWNLOADING = 'downloading'
const DOWNLOADING_INFO = 'downloading-info'

class Indapocket {

	constructor() {

		this.state = NOTHING

		// Dernières informations téléchargées
		this.info = null
		this.infoURL = ""

		// Éléments HTML
		this.$form = $('form.dl')
		this.$url = this.$form.find('[name="url"]')

		// ID du format à télécharger
		this.formatSelected = null


		// Remplir automatiquement le champ URL
		$(window).on('load', () => this.automaticallyFillURLField())
		ipc.on('window-focus', () => this.automaticallyFillURLField())

		// Coller un URL
		this.$form.find('[name="url-paste"]').click(() => {
			this.url = clipboard.readText()
		})

		// Si l'URL est modifié
		this.$form.find('[name="url"]').on('change', () => {
			console.log("URL changed")
		})

		// Récupérer le dossier de téléchargement de l'utilisateur
		ipc.send('get-user-downloads-path')
		ipc.on('user-downloads-path', (ev, dlpath) => {
			this.downloadsPath = dlpath
		})

		// Modifier le dossier de téléchargement
		this.$form.find('[name="change-downloads-path"]').on('click', () => {
			this.showSelectDirDialog()
		})

		// Modifier le dossier de téléchargement
		this.$form.find('[name="get-info"]').on('click', () => {
			this.getInfo()
		})

		// Lancer le téléchargement
		this.$form.on('submit', (event) => {
			event.preventDefault()
			this.startDownload()
		})
	}

	/**
	 * URL
	 */
	get url() {

		return this.$url.val()

	}

	/**
	 * Définir l'URL
	 */
	set url(url) {

		if (url !== this.$url.val()) {

			if (url) {

				const urlObj = urlutil.parse(url)

				if (!urlObj.protocol) urlObj.protocol = 'http:'

				urlObj.slashes = true

				url = urlObj.format()

				// Correction d'un... bug ?
				// (le module url ajoute 3 slashes au lieu de 2)
				url = url.replace(/^(https?:)\/\/\//, '$1//')

				this.$url.val(url)

				console.log(url)

			}

			else {

				this.$url.val('')

			}
			
		}

	}

	/**
	 * Nom du fichier
	 */
	get filename() {

		return $('[name="filename"]').val()

	}

	/**
	 * Définir le nom de fichier
	 * @param {String} filename
	 */
	set filename(filename) {

		$('[name="filename"]').val(filename)

	}

	/**
	 * Répertoire de téléchargement
	 */
	get downloadsPath() {

		return this._downloadsPath

	}

	/**
	 * Modifier le répertoire de téléchargement
	 */
	set downloadsPath(downloadsPath) {

		try {
			
			this._downloadsPath = path.resolve(downloadsPath)

			//const folderName = path.basename(this._downloadsPath)

			$('#downloads-folder').text(this._downloadsPath)

		}

		catch (error) {}

	}


	/**
	 * Remplir automatiquement le champ URL
	 * avec le contenu du presse-papier 
	 * si c'est bien un URL.
	 */
	automaticallyFillURLField() {

		const clipboardText = clipboard.readText()

		if (clipboardText.match(/^http:\/\//))
			this.url = clipboard.readText()

	}

	/**
	 * Afficher la fenêtre d'ouverture de dossier
	 */
	showSelectDirDialog() {

		dialog.showOpenDialog({ properties: ['openDirectory'] }, (downloadsPath) => {

			if (downloadsPath) {

				this.downloadsPath = downloadsPath[0]

			}

		})

	}

	/**
	 * Démarrer le téléchargement
	 */
	startDownload() {

		//$('#downloading .background')

		// Si l'URL a été modifié depuis le dernier getInfo
		// Ou si les infos n'ont pas été récupérées du tout
		if ((this.info && this.url !== this.infoURL) || !this.info) {

			this.getInfo((error) => {

				if (!error)
					this.download()

			})

		}

		else {

			this.download()

		}




/*
		event.preventDefault()

		const progressBar = document.querySelector('progress')

		const download = ytdl(this.url, [], { cwd: this.downloadsPath })

		let info
		let pos = 0

		console.log("Starting download")

		console.log(download)


		download.on('error', (err) => {

			console.error(err)

		})

		download.on('info', (_info) => {

			info = _info

			console.log(info)

			const output = path.join(this.downloadsPath, info._filename)
			
			download.pipe(fs.createWriteStream(output))

		})

		download.on('data', (chunk) => {

			//console.log("receiving data")

			pos += chunk.length

			if (info && info.size) {

				let percent = (pos / info.size * 100).toFixed(2)
				progressBar.value = percent.toString()

			}

		})

		download.on('next', (url) => {

			console.log(`Next download: ${url}`)

			//download(url, parameters)

		})

		download.on('end', () => {

			console.log(`Download is over: ${info._filename}`)

		})*/

	}

	/**
	 * Lance le téléchargement avec les infos et paramètres disponibles
	 */
	download() {

		console.info("Starting download")

		const $progressBar = $('#downloading .progressbar .value')

		// Image de fond de l'overlay
		const thumbnail = this.info.thumbnail || ''
		$("#downloading .background").css('background-image', `url("${this.info.thumbnail}")`)

		// Texte dans l'overlay
		$("#downloading .info").html(`
			<em>${this.info.title}</em><br />
			uploaded&nbsp;by
			<strong>${this.info.uploader}</strong>
		`)

		// Affichage de l'overlay
		$("#downloading").fadeIn(500)

		// Désactivation de tous les boutons et inputs
		$("form button, form input").attr('disabled', 'disabled')

		const download = ytdl(
			this.url,
			[`-f ${this.formatSelected}`],
			{ cwd: this.downloadsPath })

		let info
		let pos = 0

		// Chemin complet du fichier de destination
		const outputFile = path.join(this.downloadsPath, this.filename)

		// Écrire directement dans le fichier
		download.pipe(fs.createWriteStream(outputFile))

		// En cas d'erreur
		download.on('error', (err) => {

			console.error(err)

		})

		// En cas d'erreur
		download.on('info', (_info) => {

			info = _info

		})

		// Réception d'un chunk de données
		download.on('data', (chunk) => {

			//console.log("receiving data")

			pos += chunk.length

			if (info && info.size) {

				let percent = pos / info.size
				let percentString = (percent * 100).toFixed(2).toString()
				$progressBar.css('width', `${percent * 100}%`)
				
				$("#downloading .size").text(`
					${Math.round(pos/100000)/10}
					/
					${Math.round(info.size/100000)/10} Mo
				`)

			}

		})

		// Téléchargement suivant (dans le cas d'une playlist)
		download.on('next', (url) => {

			console.log(`Next download: ${url}`)

		})

		// Fin du téléchargement
		download.on('end', () => {

			console.info(`Download is over: ${this.filename}`)

		})

	}

	/**
	 * Récupère les informations pour l'URL actuel
	 * @param {Function} callback(error)
	 */
	getInfo(callback) {

		const $info = $('.info > div')
		const url = this.url

		if (url && (this.state === NOTHING || this.state === DOWNLOADING_INFO)) {

			this.state = DOWNLOADING_INFO
			$info.empty().append(`
				<p>
					Downloading informations<span class="blinking-dots"><span>.</span><span>.</span><span>.</span></span>
				</p>
			`)

			this.infoURL = null
			this.info = null

			console.info("Starting info download")

			ytdl.getInfo(url, [], (error, info) => {

				if (error) {

					console.warn("Error:", error)

					$info.html("<p>Impossible to retrieve information for this URL.</p>")

					if (callback)
						callback(true)

				}

				else {
					this.infoURL = url
					this.info = info

					const title = this.escape(info.title)
					const uploader = this.escape(info.uploader)
					const thumbnail = this.escape(info.thumbnail)

					if (!title) title = "[No title]"
					if (!uploader) uploader = "[Unknown uploader]"

					$info.html(`
						<p>
							<em>${title}</em>
							uploaded by
							<strong>${uploader}</strong>
						</p>
					`)

					if (thumbnail) {

						$info.append(`
							<img src="${thumbnail}" />
						`)

					}

					if ($('[name="filename"]').val() == false)
						$('[name="filename"]').val(info._filename)

					// Création de la liste des formats disponibles
					const $formatsContainer = $('.select-format tbody')
					$formatsContainer.html("")

					for (let i = info.formats.length - 1; i >= 0; i--) {

						let format = info.formats[i]

						// Description générale du format
						let readableformat = format.format.replace(/^\d+ - /, '')

						// Format audio
						let audioformat = format.acodec
						if (!audioformat) audioformat = '<i>?</i>'
						
						if (format.abr) audioformat += `
							<br />
							<span title="Average audio bitrate">
								${format.abr}&nbsp;KBit/s
							</span>
						`

						if (format.asr) audioformat += `
							<br />
							<span title="Audio sampling rate">
								${format.asr}&nbsp;Hz
							</span>
						`
						// Format vidéo
						let videoformat = format.vcodec
						if (!videoformat) videoformat = '<i>?</i>'
						
						if (format.vbr) videoformat += `
							<br />
							<span title="Average video bitrate">
								${format.vbr}&nbsp;KBit/s
							</span>
						`

						if (format.fps) videoformat += `
							<br />
							<span title="Frame rate">
								${format.fps}fps
							</span>
						`
						let $tr = $('<tr/>')
							.data('id', format.format_id)
							.data('ext', format.ext)
							.appendTo($formatsContainer)

						$tr.append(`
                            <td>${format.ext}</td>
                            <td>${readableformat}</td>
                            <td>${audioformat}</td>
                            <td>${videoformat}</td>
						`)

						$tr.on('click', this.selectFormat.bind(this))

						if (info.format_id === format.format_id) {

							$tr.click()

						}

					}

					if (callback)
						callback()

				}

			})

		}

	}

	/**
	 * Sélectionner un format de la liste
	 * @param {Event} event
	 */
	selectFormat(event) {

		const $tr = $(event.currentTarget)

		$('.select-format tr').removeClass('selected')

		$tr.addClass('selected')

		this.formatSelected = $tr.data('id')
		const ext = $tr.data('ext')

		if (this.filename) {

			this.filename = this.filename.replace(/\.[a-z0-9]+$/, `.${ext}`)

		}

	}


	/**
	 * Supprime les caractères HTML
	 */
	escape(text) {
		return String(text)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
	}

}

module.exports = Indapocket