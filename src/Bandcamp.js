
const { utimes } = require('fs');
const QueryString = require('querystring');
const UrlUtils = require('url');
const cheerio = require('./external/cheerio');
const {
	sendHttpRequest,
	getDurationFromText } = require('./Utils');


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

	_cleanUpURL(url) {
		const urlParts = UrlUtils.parse(url);
		if(urlParts.hash) {
			urlParts.hash = "";
		}
		return UrlUtils.format(urlParts);
	}



	_parseSearchResults(url, $, data) {
		const resultItems = $('ul.result-items > li');
		let items = [];
		// parse each result item
		resultItems.each((index, resultItem) => {
			let resultItemHtml = $(resultItem);

			// find subheading lines
			const subheads = resultItemHtml.find('.subhead').text().split('\n').map((text) => {
				text = text.trim();
				if(!text) {
					return undefined;
				}
				return text;
			}).filter((text) => (text !== undefined));

			// get item type
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

		// get MP3 files
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

		// determine if track or album
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

		// get true item URL
		let itemURL = url;
		let urlType = this._parseType(url, $);
		if(urlType !== 'track' && urlType !== 'album') {
			const ogType = $('meta[property="og:type"]').attr('content');
			if(ogType === 'album' || ogType === 'track' || ogType === 'song') {
				itemURL = $('meta[property="og:url"]').attr('content');
			}
		}

		// find common elements
		const nameSection = $('#name-section');
		const trAlbumCredits = $('.tralbum-credits');
		const trAlbumCreditsLines = trAlbumCredits.text().split('\n').map((text) => {
			text = text.trim();
			if(!text) {
				return undefined;
			}
			return text;
		}).filter((text) => (text !== undefined));

		// find item name
		const itemName = nameSection.find('.trackTitle').text().trim();

		// find artist / album name
		let artistName = undefined;
		let artistURL = undefined;
		let albumName = undefined;
		let albumURL = undefined;
		const subtitleTag = nameSection.find('h2 + h3');
		let subArtistTag = null;
		let subAlbumTag = null;
		const subtitleTagContents = subtitleTag.contents();
		subtitleTag.find('span a').each((index, tagHtml) => {
			let tagHtmlParent = $(tagHtml).parent();
			let contentIndex = null;
			for(let j=1; j<subtitleTagContents.length; j++) {
				const cmpNode = subtitleTagContents[j];
				if($(cmpNode).is($(tagHtmlParent))) {
					contentIndex = j;
					break;
				}
			}
			if(contentIndex == null || contentIndex == 0) {
				return;
			}
			let prefixTag = subtitleTagContents[contentIndex-1];
			const prefix = $(prefixTag).text().trim().toLowerCase();
			if(prefix === 'from') {
				subAlbumTag = $(tagHtml);
			}
			else if(prefix === 'by') {
				subArtistTag = $(tagHtml);
			}
		});
		if(subArtistTag != null && subArtistTag.index() !== -1) {
			artistName = subArtistTag.text().trim();
			artistURL = subArtistTag.attr('href');
		}
		if(subAlbumTag != null && subAlbumTag.index() !== -1) {
			albumName = subAlbumTag.text().trim();
			albumURL = subAlbumTag.attr('href');
		}
		const fromAlbumTag = nameSection.find('.fromAlbum');
		if(fromAlbumTag.index() !== -1) {
			let fromAlbumAnchor = null;
			if(fromAlbumTag[0].name === 'a') {
				fromAlbumAnchor = fromAlbumTag;
			} else {
				const fromAlbumParent = fromAlbumTag.parent();
				if(fromAlbumParent[0].name === 'a') {
					fromAlbumAnchor = fromAlbumParent;
				}
			}
			let fromAlbumName = fromAlbumTag.text().trim();
			if(fromAlbumName) {
				albumName = fromAlbumName;
			}
			if(fromAlbumAnchor != null && fromAlbumAnchor.index() !== -1) {
				const fromAlbumHref = fromAlbumAnchor.attr('href');
				if(fromAlbumHref) {
					albumURL = fromAlbumHref;
				}
			}
		}

		// find tags
		const tags = [];
		$('.tralbum-tags a[class="tag"]').each((index, tagHtml) => {
			tags.push($(tagHtml).text().trim());
		});

		// get release date
		let releaseDate = null;
		const releasedLinePrefix = "released ";
		const releasedLine = trAlbumCreditsLines.find((line) => {
			if(line.startsWith(releasedLinePrefix) && line.length > releasedLinePrefix.length) {
				return true;
			}
			return false;
		})
		if(releasedLine != null) {
			releaseDate = releasedLine.substring(releasedLinePrefix.length).trim();
		}

		// get description
		let description = null;
		const tralbumAbout = $('.tralbum-about');
		if(tralbumAbout != null && tralbumAbout.index() !== -1) {
			description = tralbumAbout.text();
		}

		// make item object with basic data
		const item = {
			type: type,
			url: itemURL,
			name: itemName,
			images: [],
			tags: tags,
			description: description,
			releaseDate: releaseDate
		};

		// apply artist name / url
		if(artistName) {
			item.artistName = artistName;
		}
		if(artistURL) {
			item.artistURL = UrlUtils.resolve(url, artistURL);
		}

		// apply album name / url
		if(albumName) {
			item.albumName = albumName;
		}
		if(albumURL) {
			item.albumURL = UrlUtils.resolve(url, albumURL);
		}

		// if item is a single, set album name / url as self
		if((subAlbumTag == null || subAlbumTag.index() === -1) && (fromAlbumTag == null || fromAlbumTag.index() === -1) && !albumName && !albumURL) {
			item.albumName = itemName;
			item.albumURL = itemURL;
		}

		// add images
		const tralbumArt = $('#tralbumArt');
		const largeImageURL = tralbumArt.find('a.popupImage').attr('href');
		if(largeImageURL) {
			item.images.push({url: largeImageURL, size: 'large'});
		}
		const linkImageSrc = $('link[rel="image_src"]');
		if(linkImageSrc.index() !== -1) {
			const linkImageURL = linkImageSrc.attr('href');
			if(linkImageURL && item.images.find((img) => (img.url == linkImageURL)) == null) {
				item.images.push({url: linkImageURL, size: 'medium'});
			}
		}
		const metaImage = $('meta[property="og:image"]');
		if(metaImage.index() !== -1) {
			const metaImageURL = metaImage.attr('content');
			if(metaImageURL && item.images.find((img) => (img.url == metaImageURL)) == null) {
				item.images.push({url: metaImageURL, size: 'medium'});
			}
		}
		const mediumImageURL = tralbumArt.find('img').attr('src');
		if(mediumImageURL) {
			item.images.push({url: mediumImageURL, size: 'medium'});
		}

		if(type === 'album') {
			// add tracks
			let mp3Index = 0;
			item.tracks = trackHtmls.map((trackHtml, index) => {
				const trackURL = trackHtml.find('.title a').attr('href');
				const durationText = trackHtml.find('.title .time').text().trim();
				const playDisabled = trackHtml.find('.play_col .play_status').hasClass('disabled');
				let audioURL = null;
				if(!playDisabled) {
					audioURL = mp3URLs[mp3Index];
					mp3Index++;
				}
				return {
					type: 'track',
					url: trackURL ? UrlUtils.resolve(url, trackURL) : null,
					name: trackHtml.find('.track-title').text().trim(),
					artistName: item.artistName,
					artistURL: item.artistURL,
					trackNum: (index + 1),
					duration: durationText ? getDurationFromText(durationText) : undefined,
					audioURL: audioURL,
					playable: audioURL ? true : false
				};
			});
		}
		else if(type === 'track') {
			// apply track
			item.audioURL = mp3URLs[0];
			item.playable = item.audioURL ? true : false;
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
					releaseDate: album.release_date
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
			let item = this._parseTrackInfo(url, $, dataString);
			if(!item) {
				throw new Error("Unable to parse track data");
			}
			item.artist = this._parseArtistInfo(url, $, dataString);
			if(item.type == 'track' && type == 'album' && !item.albumName && !item.albumURL) {
				const track = item;
				item = {
					type: 'album',
					url: track.url,
					name: track.name,
					images: track.images,
					artistName: track.artistName,
					artistURL: track.artistURL,
					artist: track.artist,
					tracks: [ track ],
					numTracks: 1,
					tags: track.tags,
					description: track.description
				};
			}
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
