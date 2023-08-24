const params = (new URL(document.location)).searchParams;

const save = localStorage.setItem.bind(localStorage);

const getSaved = localStorage.getItem.bind(localStorage);

const palette = {
	light: {
		bg: 'none',
		accent: '#fff4',
		text: '#000b',
		border: '#000b'
	},
	dark: {
		bg: '#000',
		accent: '#000',
		text: '#fffb',
		border: '#fff7'
	}
};

const x = document.documentElement.style;
const cssVar = x.setProperty.bind(x);
const tabColor = document.head.children.namedItem('theme-color');
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');



function themer() {

	const canvasImg = new Image();

	canvasImg.onload = () => {
		canvas.height = canvasImg.height;
		canvas.width = canvasImg.width;
		context.drawImage(canvasImg, 0, 0);

		const data = context.getImageData(0, 0, canvasImg.width, canvasImg.height).data;
		const len = data.length;
		const nthPixel = 40;
		let r = 0;
		let g = 0;
		let b = 0;
		for (let i = 0; i < len; i += nthPixel) {
			r += data[i];
			g += data[i + 1];
			b += data[i + 2];
		}
		const amount = len / nthPixel;
		r = Math.floor(r / amount), g = Math.floor(g / amount), b = Math.floor(b / amount);


		if ((r + g + b) < 85 || !r || !g || !b)
			r += 34, g += 34, b += 34;

		const theme = getSaved('theme') ? 'dark' : 'light';

		palette.dark.border = palette.light.bg = `rgb(${r},${g},${b})`;

		if (getSaved('img')) {
			palette.dark.border = 'palevioletred';
			palette.light.bg = 'linear-gradient(15deg, #13547a 0%, #80d0c7 100%)';
		}
		cssVar('--bg', palette[theme].bg);
		cssVar('--accent', palette[theme].accent);
		cssVar('--text', palette[theme].text);
		cssVar('--border', palette[theme].border);
		tabColor.content = palette[theme].bg;
	}

	canvasImg.crossOrigin = '';
	canvasImg.src = img.src;
}


img.addEventListener('load', themer);


if (!getSaved('img') && !params.get('s') && !params.get('text'))
	img.src = 'assets/ytify_thumbnail_min.webp';



function setMetaData(thumbnail, id, streamName, authorName, authorUrl) {

	if (getSaved('img')) {
		save('img', thumbnail)
		thumbnail = null;
	} else img.src = thumbnail;

	title.href = `https://youtube.com/watch?v=${id}`;
	title.textContent = streamName;
	author.href = `https://youtube.com${authorUrl}`;
	author.textContent = authorName;

	document.title = streamName + ' - ytify';
	
	if (thumbnail?.includes('maxres'))
		thumbnail = thumbnail.replace('maxres', 'hq');
		
	if ('mediaSession' in navigator) {
		navigator.mediaSession.setPositionState(null);
		navigator.mediaSession.metadata = new MediaMetadata({
			title: streamName,
			artist: authorName,
			artwork: [
				{ src: thumbnail, sizes: '96x96' },
				{ src: thumbnail, sizes: '128x128' },
				{ src: thumbnail, sizes: '192x192' },
				{ src: thumbnail, sizes: '256x256' },
				{ src: thumbnail, sizes: '384x384' },
				{ src: thumbnail, sizes: '512x512' },
	              ]
		});
	}
}



function convertSStoHHMMSS(seconds) {
	const hh = Math.floor(seconds / 3600);
	seconds %= 3600;
	let mm = Math.floor(seconds / 60);
	let ss = Math.floor(seconds % 60);
	if (mm < 10) mm = `0${mm}`;
	if (ss < 10) ss = `0${ss}`;
	return hh > 0 ?
		`${hh}:${mm}:${ss}` :
		`${mm}:${ss}`;
}



function parseTTML() {
	const myTrack = audio.textTracks[0];
	myTrack.mode = "hidden";

	fetch(audio.firstElementChild.src)
		.then(res => res.text())
		.then(text => {
			const imscDoc = imsc.fromXML(text);
			const timeEvents = imscDoc.getMediaTimeEvents();
			const telen = timeEvents.length;

			for (let i = 0; i < telen; i++) {
				const myCue = new VTTCue(timeEvents[i], (i < telen - 1) ? timeEvents[i + 1] : audio.duration, "");

				myCue.onenter = () => {
					const subtitleActive = subtitleContainer.firstChild;
					if (subtitleActive)
						subtitleContainer.removeChild(subtitleActive)
					imsc.renderHTML(imsc.generateISD(imscDoc, myCue.startTime), subtitleContainer, '', '4rem');
				}
				myCue.onexit = () => {
					const subtitleActive = subtitleContainer.firstChild;
					if (subtitleActive)
						subtitleContainer.removeChild(subtitleActive)
				}
				myTrack.addCue(myCue);
			}
		});
}


function updatePositionState() {
	if ('mediaSession' in navigator) {
		if ('setPositionState' in navigator.mediaSession) {
			navigator.mediaSession.setPositionState({
				duration: audio.duration,
				playbackRate: audio.playbackRate,
				position: audio.currentTime,
			});
		}
	}
}

if ('mediaSession' in navigator) {
	navigator.mediaSession.setActionHandler('play', () => {
		audio.play();
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler('pause', () => {
		audio.pause();
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekforward", () => {
		audio.currentTime += 10;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekbackward", () => {
		audio.currentTime -= 10;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("seekto", e => {
		audio.currentTime = e.seekTime;
		updatePositionState();
	});
	navigator.mediaSession.setActionHandler("nexttrack", () => {
		audio.onended();
		updatePositionState();
	});
}


function orderByFrequency(array) {
	const frequency = {};
	// compute frequencies of each value
	for (const value of array)
		value in frequency ?
		frequency[value]++ :
		frequency[value] = 1;
	// make array from the frequency object to de-duplicate

	const maxFreq = Math.max(...Object.values(frequency));
	if (maxFreq === 1) return;
	/*
	const uniques = [];
	for (const value in frequency)
		if (frequency[value] >= minFreqLimit)
			uniques.push(value);
	*/
	// sort the uniques array in descending order by frequency

	return Object.keys(frequency)
		.filter(key => frequency[key] === maxFreq)
		.sort((a, b) => frequency[b] - frequency[a]);
}

async function similarStreamsCollector(streamTitle, currentStream) {
	const relatives = [];
	const searchPlaylists = await fetch(pipedInstances.value + '/search?q=' + streamTitle + '&filter=playlists').then(res => res.json()).then(data => data.items);
	const depth = autoplayDepth.value;
	for (let index = 0; index < depth; index++) {
		const luckyID = searchPlaylists[index].url.slice(15);
		const playlistItems = await fetch(pipedInstances.value + '/playlists/' + luckyID).then(res => res.json()).then(data => data.relatedStreams);
		for (const stream of playlistItems)
			if (stream.duration < 600 && stream.url !== `/watch?v=${currentStream}`)
				relatives.push(stream.url.slice(9));
	}

	return relatives;
}


function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}


export {
	params,
	save,
	getSaved,
	themer,
	setMetaData,
	convertSStoHHMMSS,
	parseTTML,
	updatePositionState,
	orderByFrequency,
	similarStreamsCollector,
	shuffleArray
}