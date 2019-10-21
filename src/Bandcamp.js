
const { Buffer } = require('buffer');
const QueryString = require('querystring');
const UrlUtils = require('url');
const cheerio = require('./external/cheerio');
const { XMLHttpRequest } = require('./external/XMLHttpRequest');


const sendHttpRequest = (url, options) => {
	options = {...options};
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';
		xhr.onreadystatechange = () => {
			if(xhr.readyState === 4) {
				const data = Buffer.from((xhr.response != null) ? xhr.response : xhr.responseText);
				resolve({ data });
			}
		};
		xhr.onerror = (error) => {
			reject(error);
		};
		xhr.open(options.method || 'GET', url);
		if(options.body) {
			xhr.send(options.body);
		}
		else {
			xhr.send();
		}
	});
}

const getDurationFromText = (durationText) => {
	const durationParts = durationText.split(':');
	let durationPart = null;
	let duration = 0;
	let partCount = 0;
	while(durationPart = durationParts.pop()) {
		switch(partCount) {
			case 0:
				duration += parseInt(durationPart);
				break;

			case 1:
				duration += parseInt(durationPart) * 60;
				break;

			case 2:
				duration += parseInt(durationPart) * 60 * 60;
				break;
		}
		partCount += 1;
	}
	return duration;
}


class Bandcamp {
	_parseType(url, $=null) {
		url = UrlUtils.parse(url);
		if(url.pathname) {
			if(url.pathname === '/' || url.pathname === '/music' || url.pathname === '/releases') {
				return 'artist';
			}
			else if(url.pathname.startsWith('/album/')) {
				return 'album';
			}
			else if(url.pathname.startsWith('/track/')) {
				return 'track';
			}
		}
		if($) {
			const metaType = $('meta[property="og:type"]').attr('content');
			if(metaType === 'band') {
				return 'artist';
			}
			else if(metaType === 'song') {
				return 'track';
			}
			else if(['track', 'artist', 'album'].indexOf(metaType) !== -1) {
				return metaType;
			}
		}
		return null;
	}


	_parseSearchResults(url, $, data) {
		const resultItems = $('ul.result-items > li');
		let items = [];
		resultItems.each((index, resultItem) => {
			let resultItemHtml = $(resultItem);

			const subheads = resultItemHtml.find('.subhead').text().split('\n').map((text) => {
				text = text.replace(/\s{2,}/g, ' ').trim();
				if(!text) {
					return undefined;
				}
				return text;
			}).filter((text) => (text !== undefined));

			let type = resultItemHtml.find('.itemtype').text().trim().toLowerCase();
			if(type === 'song') {
				type = 'track';
			}
			else if(type === 'band') {
				type = 'artist';
			}

			// parse general fields
			const item = {
				type: type,
				name: resultItemHtml.find('.heading').text().trim(),
				url: resultItemHtml.find('.itemurl').text().trim(),
				imageURL: resultItemHtml.find('.art img').attr('src') || undefined,
				tags: (() => {
					let tags = resultItemHtml.find('.tags').text().trim().replace(/^tags:/, '').trim().replace(/\s/g, '');
					return (tags.length > 1) ? tags.split(',') : [];
				})(),
				genre: resultItemHtml.find('.genre').text().trim().replace(/^genre:/, '').trim().replace(/\s{2,}/g, ' ') || undefined,
				releaseDate: resultItemHtml.find('.released').text().trim().replace(/^released /, '').trim() || undefined
			};

			// parse type-specific fields
			if(item.type === 'track' || item.type === 'album') {
				let artistName = subheads.find((subhead) => {
					return subhead.startsWith('by ');
				});
				if(artistName) {
					artistName = artistName.substring('by '.length).trim();
					item.artistName = artistName;
					let artistURL = UrlUtils.resolve(item.url, '/');
					if(artistURL.endsWith('/')) {
						artistURL = artistURL.substring(0, artistURL.length-1);
					}
					item.artistURL = artistURL;
				}
			}
			if(item.type === 'track') {
				let albumName = subheads.find((subhead) => {
					return subhead.startsWith('from ');
				});
				if(albumName) {
					albumName = albumName.substring('from '.length).trim();
					item.albumName = albumName;
					if(item.artistURL) {
						item.albumURL = UrlUtils.resolve(item.artistURL, '/album/'+this.slugify(albumName));
					}
				}
				else {
					// if no album name is present, track is a single
					item.albumName = item.name;
					item.albumURL = item.url;
				}
			}
			else if(item.type === 'artist') {
				item.location = (subheads.length > 0) ? subheads[0] : undefined;
			}
			else if(item.type === 'album') {
				let artistName = subheads.find((subhead) => {
					return subhead.startsWith('by ');
				});
				if(artistName) {
					artistName = artistName.substring('by '.length).trim();
					item.artistName = artistName;
					let artistURL = UrlUtils.resolve(item.url, '/');
					if(artistURL.endsWith('/')) {
						artistURL = artistURL.substring(0, artistURL.length-1);
					}
					item.artistURL = artistURL;
				}
				item.numTracks = (() => {
					let info = resultItemHtml.find('.length').text().trim().split(',');
					if(info.length !== 2) {
						return undefined;
					}
					return parseInt(info[0].replace(/ tracks$/, ''));
				})();
				item.numMinutes = (() => {
					let info = resultItemHtml.find('.length').text().trim().split(',');
					if(info.length !== 2) {
						return undefined;
					}
					return parseInt(info[1].replace(/ minutes$/, ''));
				})();
			}

			const deleteKeys = [];
			for(const key in item) {
				if(item[key] === undefined) {
					deleteKeys.push(key);
				}
			}
			for(const key of deleteKeys) {
				delete item[key];
			}

			items.push(item);
		});
		let prevURL = $('.pager_controls a.next').attr('href');
		prevURL = prevURL ? UrlUtils.resolve(url, prevURL) : null;
		let nextURL = $('.pager_controls a.next').attr('href');
		nextURL = nextURL ? UrlUtils.resolve(url, nextURL) : null;
		return {
			items,
			nextURL,
			prevURL
		};
	}


	_parseTrackInfo(url, $, data) {
		const trackInfo = $('#trackInfo');
		if(trackInfo.index() === -1) {
			return null;
		}

		const mp3URLs = [];
		const mp3Regex = /,\s*\"file\"\s*\:\s*((?:\{\"mp3-128\"\:\"(.+?(?=\"\}))\"\})|(?:null))\s*,/gmi;
		let mp3RegMatch = null;
		while(mp3RegMatch = mp3Regex.exec(data)) {
			let audioURL = null;
			const audioURLJSON = mp3RegMatch[1];
			if(audioURLJSON) {
				audioURL = (JSON.parse(audioURLJSON) || {})["mp3-128"] || null
			}
			mp3URLs.push(audioURL);
		}

		let type = 'album';
		let trackHtmls = [];
		const trackTable = $('#track_table');
		if(trackTable.index() === -1) {
			type = 'track';
		}
		else {
			trackTable.find('.track_row_view').each((index, trackHtml) => {
				trackHtmls.push($(trackHtml));
			});
		}

		const nameSection = $('#name-section');
		const itemName = nameSection.find('.trackTitle').text().trim();

		let itemURL = url;
		let urlType = this._parseType(url, $);
		if(urlType !== 'track' && urlType !== 'album') {
			const ogType = $('meta[property="og:type"]').attr('content');
			if(ogType === 'album' || ogType === 'track') {
				itemURL = $('meta[property="og:url"]').attr('content');
			}
			else {
				itemURL = UrlUtils.resolve(url, '/'+type+'/'+this.slugify(itemName));
			}
		}

		const tralbumArt = $('#tralbumArt');
		const mediumImageURL = tralbumArt.find('img[itemprop="image"]').attr('src');
		const largeImageURL = tralbumArt.find('a.popupImage').attr('href');
		const artistTag = nameSection.find('span[itemprop="byArtist"] a');
		const albumTag = nameSection.find('span[itemprop="inAlbum"] a');
		const artistName = artistTag.text().trim();
		const artistURL = artistTag.attr('href');
		const albumName = albumTag.text().trim();
		const albumURL = albumTag.attr('href');

		const item = {
			type: type,
			url: itemURL,
			name: itemName,
			images: []
		};

		if(largeImageURL) {
			item.images.push({url: largeImageURL, size: 'large'});
		}
		if(mediumImageURL) {
			item.images.push({url: mediumImageURL, size: 'medium'});
		}

		if(artistName) {
			item.artistName = artistName;
		}
		if(artistURL) {
			item.artistURL = UrlUtils.resolve(url, artistURL);
		}

		if(albumName) {
			item.albumName = albumName;
		}
		if(albumURL) {
			item.albumURL = UrlUtils.resolve(url, albumURL);
		}

		if(type === 'album') {
			let mp3Index = 0;
			item.tracks = trackHtmls.map((trackHtml, index) => {
				const trackURL = trackHtml.find('.title a[itemprop="url"]').attr('href');
				const durationText = trackHtml.find('.title .time').text().trim();
				const playDisabled = trackHtml.find('.play_col .play_status').hasClass('disabled');
				let audioURL = null;
				if(!playDisabled) {
					audioURL = mp3URLs[mp3Index];
					mp3Index++;
				}
				return {
					type: 'track',
					url: trackURL ? UrlUtils.resolve(url, trackURL) : undefined,
					name: trackHtml.find('.title span[itemprop="name"]').text().trim(),
					trackNum: (index + 1),
					duration: durationText ? getDurationFromText(durationText) : undefined,
					audioURL: audioURL,
					playable: audioURL ? true : false
				};
			});
		}
		else if(type === 'track') {
			item.audioURL = mp3URLs[0];
			item.duration = parseFloat($('.trackView meta[itemprop="duration"]').attr('content'));
		}

		return item;
	}


	_parseArtistInfo(url, $, data) {
		// bio
		const bioContainer = $('#bio-container');
		if(bioContainer.index() === -1) {
			return null;
		}
		const bandNameLocation = bioContainer.find('#band-name-location');

		// navbar items
		const navBarArtists = $('#band-navbar a[href="/artists"]');
		let isLabel = false;
		if(navBarArtists.index() !== -1) {
			isLabel = true;
		}

		// images
		let images = [];
		const popupImage = bioContainer.find('a.popupImage');
		if(popupImage.index() !== -1) {
			const popupImageDims = popupImage.attr('data-image-size') || "";
			let [ popupImageWidth, popupImageHeight ] = popupImageDims.split(',').map((dimension) => {
				dimension = parseInt(dimension);
				if(!dimension) {
					return undefined;
				}
				return dimension;
			});
			const defaultImageWidth = (popupImageWidth && popupImageHeight) ?
				Math.round((popupImageWidth >= popupImageHeight) ? 120 : (120 * popupImageWidth / popupImageHeight))
				: undefined;
			const defaultImageHeight = (popupImageWidth && popupImageHeight) ?
				Math.round((popupImageHeight >= popupImageWidth ) ? 120 : (120 * popupImageHeight / popupImageWidth))
				: undefined;
			images.push({
				url: popupImage.attr('href'),
				width: popupImageWidth,
				height: popupImageHeight,
				size: 'large'
			}, {
				url: popupImage.find('img.band-photo').attr('src'),
				width: defaultImageWidth,
				height: defaultImageHeight,
				size: 'small'
			});
		}

		return {
			type: (isLabel) ? 'label' : 'artist',
			url: UrlUtils.resolve(url, '/'),
			name: bandNameLocation.find('.title').text().trim(),
			location: bandNameLocation.find('.location').text().trim(),
			description: bioContainer.find('meta[itemprop="description"]').attr('content'),
			images: images,
			shows: $('#showography > ul > li').toArray().map((showHtml) => {
				showHtml = $(showHtml);
				return {
					date: showHtml.find('.showDate').text().trim(),
					url: showHtml.find('.showVenue a').attr('href'),
					venueName: showHtml.find('.showVenue a').text().trim(),
					location: showHtml.find('.showLoc').text().trim()
				};
			}),
			links: $('#band-links > li').toArray().map((bandLinkHtml) => {
				bandLinkHtml = $(bandLinkHtml);
				const bandLink = bandLinkHtml.find('a');
				return {
					url: bandLink.attr('href'),
					name: bandLink.text().trim()
				};
			})
		};
	}

	_parseAlbumList(url, $, data) {
		const albumsArtistName = $('#bio-container #band-name-location .title').text().trim() || undefined;
		const basicAlbumInfos = [];
		const musicGrid = $('.music-grid');
		musicGrid.children('li').each((index, albumHtml) => {
			albumHtml = $(albumHtml);
			const itemURL = albumHtml.find('a').attr('href');
			const albumArtImage = albumHtml.find('.art img');
			const albumArtURL = (albumArtImage.index() !== -1) ? (albumArtImage.attr('data-original') || albumArtImage.attr('src')) : undefined;
			let titleHtml = albumHtml.find('.title');
			const artistNameHtml = titleHtml.find('span[class="artist-override"]');
			const titleText = titleHtml.clone().find('span[class="artist-override"]').remove().end().text().trim();
			const artistNameText = ((artistNameHtml.index() !== -1) ? artistNameHtml.text().trim() : albumsArtistName);
			basicAlbumInfos.push({
				id: albumHtml.attr('data-item-id').replace(/^(album|track)-/, ''),
				url: (itemURL ? UrlUtils.resolve(url,itemURL) : undefined),
				name: titleText,
				artistName: artistNameText,
				images: (albumArtURL) ? [
					{
						url: albumArtURL,
						size: 'small'
					}
				] : []
			});
		});

		const pageData = musicGrid.attr('data-initial-values');
		if(pageData) {
			return JSON.parse(pageData).map((album) => {
				const matchIndex = basicAlbumInfos.findIndex((albumInfo) => (albumInfo.id == album.id));
				let basicAlbumInfo = {};
				if(matchIndex !== -1) {
					basicAlbumInfo = basicAlbumInfos[matchIndex];
					basicAlbumInfos.splice(matchIndex, 1);
				}
				let itemURL = (basicAlbumInfo.url || album.page_url);
				itemURL = itemURL ? UrlUtils.resolve(url, itemURL) : undefined;
				const artistURL = itemURL ? UrlUtils.resolve(itemURL, '/') : undefined;
				return {
					type: album.type,
					name: album.title || basicAlbumInfo.name,
					url: itemURL,
					artistName: album.artist || album.band_name || basicAlbumInfo.artistName || albumsArtistName,
					artistURL: artistURL,
					images: basicAlbumInfo ? basicAlbumInfo.images : [],
					releaseDate: album.release_date,
					publishDate: album.publish_date,
				};
			});
		}
		else if(musicGrid.index() !== -1) {
			return basicAlbumInfos;
		}
		else {
			return null;
		}
	}


	slugify(str) {
		let charMap = {
			"'": '',
			'"': '',
			'(': '',
			')': ''
		};
		let output = str.split('')
			// replace special characters
			.reduce((result, ch) => {
				const repCh = charMap[ch];
				if(repCh != null) {
					return result + repCh;
				}
				return result + ch.replace(/([^\w\s$*_+~.'"!:@]|(\.|\+|\*|~|\\|\/))/g, '-')
			}, '')
			.toLowerCase()
			// trim leading/trailing spaces
			.trim()
			// convert spaces
			.replace(/[-\s]+/g, '-')
			// remove consecutive dashes;
			.replace(/--+/, '-');
		// remove ending dashes
		while(output.length > 1 && output.endsWith('-')) {
			output = output.slice(0, output.length-1);
		}
		// remove beginning dashes
		while(output.length > 1 && output.startsWith('-')) {
			output = output.slice(1, output.length-1);
		}
		return output;
	}



	async search(query, options) {
		// create and send request
		const params = {
			...options,
			q: query
		};
		const url = "https://bandcamp.com/search?"+QueryString.stringify(params);
		const { res, data } = await sendHttpRequest(url);
		// parse result
		const $ = cheerio.load(data.toString());
		return this._parseSearchResults(url, $);
	}

	async getItemFromURL(url, type=null) {
		if(!type) {
			type = this._parseType(url);
		}

		const { res, data } = await sendHttpRequest(url);
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);

		if(type === 'track' || type === 'album') {
			const item = this._parseTrackInfo(url, $, dataString);
			if(!item) {
				throw new Error("Unable to parse track data");
			}
			item.artist = this._parseArtistInfo(url, $, dataString);
			return item;
		}
		else if(type === 'artist') {
			const artist = this._parseArtistInfo(url, $, dataString);
			const albums = this._parseAlbumList(url, $, dataString);
			if(albums) {
				artist.albums = albums;
			}
			else {
				const album = this._parseTrackInfo(url, $, dataString);
				if(album) {
					artist.albums = [ album ];
				}
			}
			return artist;
		}
		else {
			return this._parseArtistInfo(url, $, dataString);
		}
	}

	async getTrack(trackURL) {
		return await this.getItemFromURL(trackURL, 'track');
	}

	async getAlbum(albumURL) {
		return await this.getItemFromURL(albumURL, 'album');
	}

	async getArtist(artistURL) {
		return await this.getItemFromURL(UrlUtils.resolve(artistURL,'/music'), 'artist');
	}
}



module.exports = Bandcamp;
