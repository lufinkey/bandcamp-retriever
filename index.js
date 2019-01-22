
const { Buffer } = require('buffer');
const QueryString = require('querystring');
const cheerio = require('./cheerio');
const UrlUtils = require('url');


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
			if(url.pathname === '/' || url.pathname === '/music') {
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
			switch(item.type) {
				case 'track': {
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
					let albumName = subheads.find((subhead) => {
						return subhead.startsWith('from ');
					});
					if(albumName) {
						albumName = albumName.substring('from '.length).trim();
						item.albumName = albumName;
					}
					else {
						// if no album name is present, track is a single
						item.albumName = item.name;
						item.albumURL = item.url;
					}
				}
				break;

				case 'artist': {
					item.location = (subheads.length > 0) ? subheads[0] : undefined;
				}
				break;

				case 'album': {
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
				break;
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
		const type = this._parseType(url);

		const trackInfo = $('#trackInfo');
		if(trackInfo.index() === -1) {
			return null;
		}

		const nameSection = $('#name-section');

		const mp3URLs = [];
		const mp3Regex = /\{\"mp3-128\"\:\"(.+?(?=\"\}))\"\}/gmi;
		let mp3RegMatch = null;
		while(mp3RegMatch = mp3Regex.exec(data)) {
			mp3URLs.push(JSON.parse(mp3RegMatch[0])["mp3-128"]);
		}

		let trackHtmls = [];
		$('#trackInfo .track_list .track_row_view').each((index, trackHtml) => {
			trackHtmls.push($(trackHtml));
		});

		const tralbumArt = $('#tralbumArt');
		const smallImageURL = tralbumArt.find('img[itemprop="image"]').attr('src');
		const largeImageURL = tralbumArt.find('a.popupImage').attr('href');
		const artistTag = nameSection.find('span[itemprop="byArtist"] a');
		const albumTag = nameSection.find('span[itemprop="inAlbum"] a');
		const artistName = artistTag.text().trim();
		const artistURL = artistTag.attr('href');
		const albumName = albumTag.text().trim();
		const albumURL = albumTag.attr('href');

		const item = {
			type: type,
			url: url,
			name: nameSection.find('.trackTitle').text().trim(),
			images: []
		};

		if(largeImageURL) {
			item.images.push({url: largeImageURL});
		}
		if(smallImageURL) {
			item.images.push({url: smallImageURL});
		}
		if(artistName) {
			item.artistName = artistName;
			item.artistURL = artistURL;
		}
		if(albumName) {
			item.albumName = albumName;
			item.albumURL = albumURL;
		}

		if(type === 'album') {
			item.tracks = trackHtmls.map((trackHtml, index) => {
				const trackURL = trackHtml.find('.title a[itemprop="url"]').attr('href');
				const durationText = trackHtml.find('.title .time').text().trim();
				return {
					url: trackURL ? UrlUtils.resolve(url, trackURL) : undefined,
					name: trackHtml.find('.title span[itemprop="name"]').text().trim(),
					duration: durationText ? getDurationFromText(durationText) : undefined,
					audioURL: mp3URLs[index]
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

		// images
		let images = [];
		const popupImage = bioContainer.find('a.popupImage');
		if(popupImage) {
			const popupImageSize = popupImage.attr('data-image-size') || "";
			let [ popupImageWidth, popupImageHeight ] = popupImageSize.split(',').map((dimension) => {
				dimension = parseInt(dimension);
				if(!dimension) {
					return undefined;
				}
				return dimension;
			});
			images.push({
				url: popupImage.attr('href'),
				width: popupImageWidth,
				height: popupImageHeight
			}, {
				url: popupImage.find('img.band-photo').attr('src'),
				width: (popupImageWidth && popupImageHeight) ?
					Math.round((popupImageWidth >= popupImageHeight) ? 120 : (120 * popupImageWidth / popupImageHeight))
					: undefined,
				height: (popupImageWidth && popupImageHeight) ?
					Math.round((popupImageHeight >= popupImageWidth ) ? 120 : (120 * popupImageHeight / popupImageWidth))
					: undefined
			});
		}

		return {
			type: 'artist',
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
		const basicAlbumInfos = [];
		const musicGrid = $('.music-grid');
		musicGrid.children('li').each((index, albumHtml) => {
			albumHtml = $(albumHtml);
			const itemURL = albumHtml.find('a').attr('href');
			basicAlbumInfos.push({
				id: albumHtml.attr('data-item-id').replace(/^(album|track)-/, ''),
				url: (itemURL ? UrlUtils.resolve(url,itemURL) : undefined),
				name: albumHtml.find('.title').text().trim(),
				imageURL: albumHtml.find('.art img').attr('src')
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
				const itemURL = (basicAlbumInfo.url || album.page_url);
				return {
					type: album.type,
					name: album.title,
					artistName: album.artist || album.band_name || undefined,
					url: itemURL ? UrlUtils.resolve(url, itemURL) : undefined,
					imageURL: basicAlbumInfo ? basicAlbumInfo.imageURL : undefined,
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
		const dataString = data.toString();
		const $ = cheerio.load(dataString);

		if(type === 'track' || type === 'album') {
			const item = this._parseTrackInfo(url, $, dataString);
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
