
const UrlUtils = require('url');
const cheerio = require('cheerio');



class BandcampParser {
	parseResponseHeaders(res) {
		const headers = {};
		const rawHeaders = res.rawHeaders;
		for(let i=0; i<rawHeaders.length; i++) {
			const headerName = rawHeaders[i];
			i++;
			let headerValue = rawHeaders[i];
			const existingHeaderValue = headers[headerName];
			if(existingHeaderValue) {
				if(existingHeaderValue instanceof Array) {
					headerValue = existingHeaderValue.concat([ headerValue ]);
				} else {
					headerValue = [ existingHeaderValue, headerValue ]
				}
			}
			headers[headerName] = headerValue;
		}
		return headers;
	}



	isUrlBandcampDomain(url) {
		const urlParts = UrlUtils.parse(url);
		if(urlParts.hostname === 'bandcamp.com' || urlParts.hostname.endsWith('.bandcamp.com')) {
			return true;
		}
		return false;
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



	parseType(url, $=null) {
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



	cleanUpURL(url) {
		const urlParts = UrlUtils.parse(url);
		if(urlParts.hash) {
			urlParts.hash = "";
		}
		let cleanedURL = UrlUtils.format(urlParts);
		while(cleanedURL.endsWith('/')) {
			cleanedURL = cleanedURL.substring(0, cleanedURL.length-1);
		}
		return cleanedURL;
	}


	padImageId(imageId) {
		imageId = ''+imageId;
		while(imageId.length < 10) {
			imageId = '0'+imageId;
		}
		return imageId;
	}

	createImagesFromImageId(imageId) {
		const baseURL = 'https://f4.bcbits.com/img';
		return [
			{
				url: `${baseURL}/${imageId}_10.jpg`,
				size: 'large'
			},
			{
				url: `${baseURL}/${imageId}_16.jpg`,
				size: 'large'
			},
			{
				url: `${baseURL}/${imageId}_9.jpg`,
				size: 'medium'
			},
			{
				url: `${baseURL}/${imageId}_6.jpg`,
				size: 'small'
			}
		];
	}



	parseSearchResultsData(url, data) {
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		return this.parseSearchResults(url, $);
	}
	parseSearchResults(url, $) {
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



	parseTrackInfo(url, $) {
		const trackInfo = $('#trackInfo');
		if(trackInfo.index() === -1) {
			return null;
		}

		// find common elements
		const nameSection = $('#name-section');
		const trackTable = $('#track_table');
		const trAlbumCredits = $('.tralbum-credits');
		const trAlbumCreditsLines = trAlbumCredits.text().split('\n').map((text) => {
			text = text.trim();
			if(!text) {
				return undefined;
			}
			return text;
		}).filter((text) => (text !== undefined));

		// get LD JSON
		let ldJson = null;
		const ldJsonTag = $('script[type="application/ld+json"]');
		if(ldJsonTag != null && ldJsonTag.index() !== -1) {
			const ldJsonStr = ldJsonTag.html().trim();
			try {
				ldJson = JSON.parse(ldJsonStr);
			} catch(error) {
				ldJson = null;
			}
		}

		// get data-tralbum
		let trAlbumData = null;
		const trAlbumDataText = $('script[data-tralbum]').attr('data-tralbum');
		if(trAlbumDataText) {
			try {
				trAlbumData = JSON.parse(trAlbumDataText);
			} catch(error) {
				trAlbumData = null;
			}
		}

		// determine if track or album
		let type = null;
		if(ldJson) {
			let ldTypes = ldJson['@type'];
			if(typeof ldTypes === 'string') {
				ldTypes = [ ldTypes ];
			}
			if(ldTypes && ldTypes instanceof Array) {
				if(ldTypes.includes('MusicAlbum') || ldTypes.includes('album') || ldTypes.includes('Album')) {
					type = 'album';
				}
				else if(ldTypes.includes('MusicRecording') || ldTypes.includes('track') || ldTypes.includes('Track')) {
					type = 'track';
				}
			}
		}
		if(trAlbumData) {
			const trItemType = trAlbumData['item_type'];
			if(trItemType === 'album' || trItemType === 'track') {
				type = trItemType;
			} else if(trItemType === 'song') {
				type = 'track';
			}
		}
		if(type == null) {
			if(trackTable.index() === -1) {
				type = 'track';
			}
			else {
				type = 'album';
			}
		}

		// get item URL
		let itemURL = url;
		let urlType = this.parseType(url, $);
		if(urlType !== 'track' && urlType !== 'album') {
			const ogType = $('meta[property="og:type"]').attr('content');
			if(ogType === 'album' || ogType === 'track' || ogType === 'song') {
				itemURL = $('meta[property="og:url"]').attr('content');
			}
		}
		if(ldJson) {
			const ldJsonURL = ldJson['url'];
			if(typeof ldJsonURL === 'string') {
				itemURL = ldJsonURL;
			} else {
				const ldJsonId = ldJson['@id'];
				if(typeof ldJsonId === 'string' && ldJsonId.startsWith('http')) {
					itemURL = ldJsonId;
				}
			}
		}
		if(trAlbumData) {
			const trURL = trAlbumData['url'];
			if(typeof trURL === 'string' && trURL) {
				itemURL = trURL;
			}
		}
		if(itemURL.startsWith('/')) {
			itemURL = this.cleanUpURL(UrlUtils.resolve(url, itemURL));
		} else if(itemURL) {
			itemURL = this.cleanUpURL(itemURL);
		}

		// find item name
		let itemName = nameSection.find('.trackTitle').text().trim();
		if(ldJson) {
			const ldJsonName = ldJson['name'];
			if(typeof ldJsonName === 'string' && ldJsonName) {
				itemName = ldJsonName;
			}
		}

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
		if(ldJson) {
			const ldByArtist = ldJson['byArtist'];
			if(ldByArtist) {
				const ldArtistName = ldByArtist['name'];
				if(typeof ldArtistName === 'string' && ldArtistName) {
					artistName = ldArtistName;
				}
				const ldArtistURL = ldByArtist['url'];
				if(typeof ldArtistURL === 'string' && ldArtistURL) {
					artistURL = ldArtistURL;
				} else {
					const ldArtistId = ldByArtist['@id'];
					if(typeof ldArtistId === 'string' && ldArtistId.startsWith('http')) {
						artistURL = ldArtistId;
					}
				}
			}
			const ldInAlbum = ldJson['inAlbum'];
			if(ldInAlbum) {
				const ldAlbumName = ldInAlbum['name'];
				if(typeof ldAlbumName === 'string' && ldAlbumName) {
					albumName = ldAlbumName;
				}
				const ldAlbumURL = ldInAlbum['url'];
				if(typeof ldAlbumURL === 'string' && ldAlbumURL) {
					albumURL = ldAlbumURL;
				} else {
					const ldAlbumId = ldInAlbum['@id'];
					if(typeof ldAlbumId === 'string' && ldAlbumId.startsWith('http')) {
						albumURL = ldAlbumId;
					}
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
		if(ldJson) {
			const ldDatePublished = ldJson['datePublished'];
			if(typeof ldDatePublished === 'string' && ldDatePublished) {
				releaseDate = ldDatePublished;
			}
		}
		if(releaseDate == null) {
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
		}

		// get description
		let description = null;
		const tralbumAbout = $('.tralbum-about');
		if(tralbumAbout != null && tralbumAbout.index() !== -1) {
			description = tralbumAbout.text();
		}
		if(!description && ldJson) {
			const ldDescription = ldJson['description'];
			if(typeof ldDescription === 'string') {
				description = ldDescription;
			}
		}
		if(!description && trAlbumData) {
			const trCurrent = trAlbumData['current'];
			if(trCurrent) {
				const trDescription = trCurrent['about'];
				if(typeof trDescription === 'string') {
					description = trDescription;
				}
			}
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
			item.artistURL = this.cleanUpURL(UrlUtils.resolve(url, artistURL));
		}

		// apply album name / url
		if(albumName) {
			item.albumName = albumName;
		}
		if(albumURL) {
			item.albumURL = this.cleanUpURL(UrlUtils.resolve(url, albumURL));
		}

		// if item is a single, set album name / url as self
		/*if((subAlbumTag == null || subAlbumTag.index() === -1) && (fromAlbumTag == null || fromAlbumTag.index() === -1) && albumName == null && albumURL == null) {
			item.albumName = itemName;
			item.albumURL = itemURL;
		}*/

		// add images
		const tralbumArt = $('#tralbumArt');
		const largeImageURL = tralbumArt.find('a.popupImage').attr('href');
		if(largeImageURL) {
			item.images.push({url: largeImageURL, size: 'large'});
		}
		if(ldJson) {
			let ldJsonImages = ldJson['image'];
			if(typeof ldJsonImages === 'string') {
				ldJsonImages = [ ldJsonImages ];
			}
			if(ldJsonImages instanceof Array) {
				for(const ldJsonImage of ldJsonImages) {
					if(typeof ldJsonImage === 'string' && ldJsonImage.startsWith('http')) {
						if(item.images.find((img) => (img.url == ldJsonImage)) == null) {
							ldJsonImages.push({
								url: ldJsonImage,
								size: 'large'
							});
						}
					}
				}
			}
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

		// helper function to parse audio sources
		const parseTrTrackAudioSources = (trTrack) => {
			const trTrackFile = trTrack['file'];
			if(trTrackFile) {
				const trFileTypes = Object.keys(trTrackFile);
				const audioSources = [];
				for(const trFileType of trFileTypes) {
					const fileURL = trTrackFile[trFileType];
					if(typeof fileURL === 'string' && fileURL) {
						audioSources.push({
							type: trFileType,
							url: fileURL
						});
					}
				}
				return audioSources;
			}
			return [];
		};

		// parse type-specific data
		if(type === 'album') {
			// construct tracks
			let trackHtmls = [];
			if(trackTable.index() !== -1) {
				trackTable.find('.track_row_view').each((index, trackHtml) => {
					trackHtmls.push($(trackHtml));
				});
			}
			let ldTracks = [];
			if(ldJson) {
				const ldTrackObj = ldJson['track'];
				if(ldTrackObj) {
					const ldItems = ldTrackObj['itemListElement'];
					if(ldItems instanceof Array) {
						ldTracks = ldItems;
					}
				}
			}
			let trTracks = [];
			if(trAlbumData) {
				const trAlbumTracks = trAlbumData['trackinfo'];
				if(trAlbumTracks instanceof Array) {
					trTracks = trAlbumTracks;
				}
			}
			const tracks = [];
			for(let i=0; i<trackHtmls.length || i<ldTracks.length || i<trTracks.length; i++) {
				const track = {
					type: 'track',
					artistName: item.artistName,
					artistURL: item.artistURL,
					trackNum: (i + 1)
				};
				// add properties from html
				if(i < trackHtmls.length) {
					const trackHtml = trackHtmls[i];
					const trackURLTag = trackHtml.find('.title a');
					const trackTitle = trackHtml.find('.track-title');
					const durationText = trackHtml.find('.title .time').text().trim();
					const playStatus = trackHtml.find('.play_col .play_status');

					if(trackURLTag.index() !== -1) {
						const trackURL = trackURLTag.attr('href');
						if(trackURL) {
							track.url = this.cleanUpURL(UrlUtils.resolve(url, trackURL));
						}
					}
					if(trackTitle.index() !== -1) {
						track.name = trackTitle.text().trim();
					}
					if(durationText) {
						const duration = this.parseDurationFromText(durationText);
						if(duration != null) {
							track.duration = duration;
						}
					}
					if(playStatus.index() !== -1) {
						track.playable = playStatus.hasClass('disabled');
					}
				}
				// add properties from LD JSON
				if(i < ldTracks.length) {
					const ldTrack = ldTracks[i];
					const ldTrackItem = ldTrack['item'];
					if(ldTrackItem) {
						const ldTrackName = ldTrackItem['name'];
						if(typeof ldTrackName === 'string' && ldTrackName) {
							track.name = ldTrackName;
						}
						const ldTrackURL = ldTrackItem['url'];
						if(typeof ldTrackURL === 'string' && ldTrackURL) {
							track.url = this.cleanUpURL(UrlUtils.resolve(url, ldTrackURL));
						} else {
							const ldTrackId = ldTrackId['@id'];
							if(typeof ldTrackId === 'string' && ldTrackId.startsWith('http')) {
								track.url = this.cleanUpURL(ldTrackId);
							}
						}
					}
				}
				// add properties from data-tralbum
				if(i < trTracks.length) {
					const trTrack = trTracks[i];
					const audioSources = parseTrTrackAudioSources(trTrack);
					track.audioSources = audioSources;
					if(audioSources.length > 0) {
						track.playable = true;
					} else {
						track.playable = false;
					}
					const trTrackId = trTrack['id'];
					if(trTrackId) {
						track.id = trTrackId;
					}
					const trTrackTitle = trTrack['title'];
					if(typeof trTrackTitle === 'string' && trTrackTitle) {
						track.name = trTrackTitle;
					}
					const trTrackDuration = trTrack['duration'];
					if(typeof trTrackDuration === 'number' && trTrackDuration) {
						track.duration = trTrackDuration;
					}
					const trTrackURL = trTrack['title_link'];
					if(typeof trTrackURL === 'string' && trTrackURL) {
						track.url = UrlUtils.resolve(url, trTrackURL);
					}
				}
				// attempt to split track name into artist and track name
				if(track.name) {
					var nameSlug = null;
					if(track.url != null) {
						const urlParts = UrlUtils.parse(track.url);
						const prefixTrim = "/track/"
						if(urlParts.pathname && urlParts.pathname.startsWith(prefixTrim)) {
							nameSlug = urlParts.pathname.substring(prefixTrim.length);
							while(nameSlug.startsWith('/')) {
								nameSlug = nameSlug.substring(1);
							}
							while(nameSlug.endsWith('/')) {
								nameSlug = nameSlug.substring(0, nameSlug.length-1);
							}
							const slashIndex = nameSlug.indexOf('/');
							if(slashIndex != -1) {
								nameSlug = numSlug.substring(0, nameSlug);
							}
						}
					}
					if(nameSlug != null) {
						const dashSearchStr = " - ";
						let dashSearchStartIndex = 0;
						while(true) {
							const dashIndex = track.name.indexOf(dashSearchStr, dashSearchStartIndex);
							if(dashIndex == -1) {
								break;
							}
							const possibleName = track.name.substring(dashIndex+dashSearchStr.length);
							const cmpNameSlug = this.slugify(possibleName);
							if(cmpNameSlug === nameSlug || (cmpNameSlug.length >= (nameSlug.length / 2) && nameSlug.startsWith(cmpNameSlug))) {
								const artistName = track.name.substring(0, dashIndex);
								track.name = possibleName;
								track.artistName = artistName;
								break;
							}
							dashSearchStartIndex = dashIndex + dashSearchStr.length;
						}
					}
				}
				// append track
				tracks.push(track);
			}
			item.tracks = tracks;
		}
		else if(type === 'track') {
			// apply track
			if(trAlbumData) {
				const trTracks = trAlbumData['trackinfo'];
				if(trTracks instanceof Array && trTracks.length > 0) {
					const trTrack = trTracks[0];
					const audioSources = parseTrTrackAudioSources(trTrack);
					item.audioSources = audioSources;
					if(audioSources.length > 0) {
						item.playable = true;
					} else {
						item.playable = false;
					}
					const trTrackDuration = trTrack['duration'];
					if(typeof trTrackDuration === 'number' && trTrackDuration) {
						item.duration = trTrackDuration;
					}
				}
			}
		}

		return item;
	}



	parseArtistInfo(url, $) {
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
			description: bioContainer.find('#bio-text').text().trim(),
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



	parseAlbumList(url, $) {
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

		const pageDataJson = musicGrid.attr('data-initial-values');
		let pageData;
		try {
			pageData = JSON.parse(pageDataJson);
		} catch(error) {
			pageData = null;
		}
		if(pageData) {
			return pageData.map((album) => {
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



	parseItemDataFromURL(url, type, data) {
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		return this.parseItemFromURL(url, type, $);
	}
	parseItemFromURL(url, type, $) {
		if(type === 'track' || type === 'album') {
			// parse track or album data
			let item = this.parseTrackInfo(url, $);
			if(!item) {
				throw new Error("Unable to parse track data");
			}
			item.artist = this.parseArtistInfo(url, $);
			// if item is a single, and we were requesting an album, mutate into an album
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
			const artist = this.parseArtistInfo(url, $);
			const albums = this.parseAlbumList(url, $);
			if(albums) {
				artist.albums = albums;
			}
			else {
				// sometimes artist homepage is just a single album
				const album = this.parseTrackInfo(url, $);
				if(album) {
					artist.albums = [ album ];
				}
			}
			return artist;
		}
		else {
			const artist = this.parseArtistInfo(url, $);
			return artist;
		}
	}



	parseDurationFromText(durationText) {
		const durationParts = durationText.split(':');
		let durationPart = null;
		let duration = 0;
		let partCount = 0;
		while(durationPart = durationParts.pop()) {
			if(durationPart.length == 0) {
				continue;
			}
			const durationPartNum = parseInt(durationPart);
			if(isNaN(durationPartNum)) {
				return null;
			}
			switch(partCount) {
				case 0:
					duration += durationPartNum;
					break;
	
				case 1:
					duration += durationPartNum * 60;
					break;
	
				case 2:
					duration += durationPartNum * 60 * 60;
					break;
			}
			partCount += 1;
		}
		return duration;
	}



	parseStreamFiles(data) {
		const dataString = data.toString();
		if(!dataString) {
			return null;
		}
		if(dataString === 'oops') {
			throw new Error("request misformatted, got an oops");
		}
		const regex = /OwnerStreaming\.init\(.*\);/g;
		const matches = dataString.match(regex);
		if(!matches || matches.length === 0) {
			return null;
		}
		let match = matches[0];
		const prefix = 'OwnerStreaming.init(';
		if(match.startsWith(prefix)) {
			match = match.substring(prefix.length);
		}
		const suffix = ');';
		if(match.endsWith(suffix)) {
			match = match.substring(0, match.length-suffix.length);
		}
		try {
			return JSON.parse(match);
		} catch(error) {
			return null;
		}
	}



	parseCDUILink($) {
		let scriptTags = [];
		$('script').each((index, tag) => {
			tag = $(tag);
			const src = tag.attr('src');
			if(src && src.startsWith('https://bandcamp.com/cd_ui?')) {
				scriptTags.push(tag);
			}
		});
		if(scriptTags.length === 0) {
			return null;
		}
		return scriptTags[0].attr('src');
	}


	attachStreamsToTracks(tracks, streams) {
		if(typeof streams !== 'object') {
			return;
		}
		const getStreamFiles = (id, index) => {
			if(id == null) {
				const keys = Object.keys(streams);
				return streams[keys[index]];
			}
			return streams[id];
		};
		let i=0;
		for(const track of tracks) {
			const streamFiles = getStreamFiles(track.id, i);
			if(typeof streamFiles !== 'object') {
				i++;
				continue;
			}
			const streamFileKeys = Object.keys(streamFiles);//.sort();
			if(streamFileKeys.length > 0) {
				if(!track.audioSources) {
					track.audioSources = [];
				}
				for(const streamFileType of streamFileKeys) {
					const url = streamFiles[streamFileType];
					// avoid duplicate audio sources
					if(track.audioSources.find((source) => (source.url === url || source.type === streamFileType))) {
						continue;
					}
					track.audioSources.push({
						type: streamFileType,
						url: url
					});
				}
				if(track.audioSources.length > 0) {
					track.playable = true;
				}
			}
			i++;
		}
	}


	parseIdentitiesFromPage($) {
		const homePageDataJson = $('#pagedata').attr('data-blob');
		if(!homePageDataJson) {
			return null;
		}
		let pageData;
		try {
			pageData = JSON.parse(homePageDataJson);
		} catch(error) {
			return null;
		}
		if(!pageData) {
			return null;
		}
		return this.parseIdentitiesFromJson(pageData);
	}

	parseIdentitiesFromJson(pageData) {
		if(!pageData.identities) {
			return null;
		}
		const identities = {};
		// parse fan identity
		const fanIdentity = pageData.identities.fan;
		if(fanIdentity) {
			let images = null;
			if(fanIdentity.photo != null) {
				if(typeof fanIdentity.photo === 'string' && fanIdentity.startsWith("http")) {
					images = [
						{
							url: fanIdentity.photo,
							size: 'medium'
						}
					];
				} else if(typeof fanIdentity.photo === 'string' || typeof fanIdentity.photo === 'number') {
					const imageId = this.padImageId(fanIdentity.photo);
					images = this.createImagesFromImageId(imageId);
				}
			}
			identities.fan = {
				id: ''+fanIdentity.id,
				url: fanIdentity.url,
				username: fanIdentity.username,
				private: fanIdentity.private,
				verified: fanIdentity.verified,
				photoId: fanIdentity.photo,
				name: fanIdentity.name,
				images: images
			};
		}
		// return identities
		return identities;
	}



	parseFanHtmlData(url, data) {
		if(!data) {
			return null;
		}
		const dataString = data.toString();
		if(!dataString) {
			return null;
		}
		const $ = cheerio.load(dataString);
		return this.parseFanHtml(url, $);
	}



	parseFanPageDataFanJson(fanData, fan={}) {
		if(!fanData) {
			return null;
		}
		if(!fan) {
			fan = {};
		}
		if(fanData.fan_id) {
			fan.id = ''+fanData.fan_id;
		}
		if(fanData.trackpipe_url) {
			fan.url = fanData.trackpipe_url;
		}
		if(fanData.name) {
			fan.name = fanData.name;
		}
		if(fanData.username) {
			fan.username = fanData.username;
		}
		if(typeof fanData.bio === 'string') {
			fan.description = fanData.bio;
		}
		if(fanData.photo && typeof fanData.photo === 'object' && fanData.photo.image_id) {
			const imageId = this.padImageId(fanData.photo.image_id);
			fan.images = this.createImagesFromImageId(imageId);
		}
		return fan;
	}

	parseFanPageDataSection(listData, itemCache, existingSection, mapper) {
		if(!listData || !(listData.sequence || listData.pending_sequence)) {
			return existingSection || null;
		}
		// parse items
		const section = existingSection || {};
		if(typeof listData.last_token === 'string') {
			section.lastToken = listData.last_token;
		}
		if(typeof listData.item_count === 'number') {
			section.itemCount = listData.item_count;
		}
		if(typeof listData.batch_size === 'number') {
			section.batchSize = listData.batch_size;
		}
		let sequence = listData.sequence;
		if((!(sequence instanceof Array) || sequence.length === 0) && listData.pending_sequence && listData.pending_sequence instanceof Array) {
			sequence = listData.pending_sequence;
		}
		if(sequence && sequence instanceof Array && itemCache) {
			let items = sequence.map(mapper);
			if(items.length > 0) {
				// if everything we mapped was null, we shouldn't set the list
				let allNulls = true;
				for(const item of items) {
					if(item) {
						allNulls = false;
						break;
					}
				}
				if(allNulls) {
					items = null;
				}
			}
			// filter null items
			if(items) {
				items = items.filter((item) => {
					return (!!item); // item must be truthy
				});
				section.items = items;
			}
		}
		return section;
	}

	parseFanPageDataMediaSectionJson(listData, itemCache, trackLists, existingSection) {
		const existingItems = existingSection.items || [];
		return this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier) => {
			// pull item data
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				return null;
			}
			// parse item type
			let itemType = itemData.item_type;
			if(!itemType && itemData.item_url) {
				itemType = this.parseType(itemData.item_url);
			}
			if(itemType === 'song') {
				itemType = 'track';
			} else if(itemType == 'band') {
				itemType = 'artist';
			}
			// parse item url
			const itemURL = itemData.item_url ? this.cleanUpURL(itemData.item_url) : undefined;
			// find existing item
			let itemNode = {};
			let item = {};
			if(itemData.item_id) {
				const existingItemIndex = existingItems.findIndex((cmpNode) => {
					if(itemData.item_id && cmpNode.itemId && itemData.item_id == cmpNode.itemId) {
						return true;
					}
					return false;
				});
				if(existingItemIndex !== -1) {
					itemNode = existingItems[existingItemIndex];
					item = itemNode.item || {};
					existingItems.splice(existingItemIndex,1);
				}
			}
			// attach basic item data
			if(itemType) {
				item.type = itemType;
			}
			if(itemURL) {
				item.url = itemURL;
			}
			if(itemData.item_title) {
				item.name = itemData.item_title;
			}
			// attach artist if necessary
			if(item.type === 'track' || item.type === 'album') {
				if(itemData.band_name) {
					item.artistName = itemData.band_name;
				}
				if(itemData.item_url) {
					item.artistURL = this.cleanUpURL(UrlUtils.resolve(itemData.item_url, '/'));
				}
			}
			// add photos
			if(itemData.item_art_id) {
				const imageId = 'a'+this.padImageId(itemData.item_art_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			// attach audio sources if item is a track
			if(item.type === 'track' && trackLists) {
				const trackList = trackLists[itemIdentifier];
				const itemId = itemData.item_id;
				if(trackList && itemId) {
					const trackData = trackList.find((trackData) => {
						return trackData.id == itemId;
					});
					if(trackData) {
						if(typeof trackData.title === 'string' && trackData.title) {
							item.name = trackData.title;
						}
						if(typeof trackData.duration === 'number') {
							item.duration = trackData.duration;
						}
						if(typeof trackData.artist === 'string' && trackData.artist) {
							item.artistName = trackData.artist;
						}
						if(typeof trackData.track_number === 'number') {
							item.trackNum = trackData.track_number;
						}
						if(typeof trackData.file === 'object' && trackData.file) {
							item.audioSources = Object.keys(trackData.file).map((fileType) => {
								return {
									type: fileType,
									url: trackData.file[fileType]
								};
							});
						}
					}
				}
			}
			// attach album or become album if needed
			if(item.type === 'track') {
				if(itemData.album_id === null && (!itemData.url_hints || itemData.url_hints.item_type === 't')) {
					// item is a "single", so make it an album
					item = {
						type: 'album',
						url: item.url,
						name: item.name,
						artistName: item.artistName,
						artistURL: item.artistURL,
						images: item.images,
						tracks: [ item ]
					};
				} else if(item.url && itemData.url_hints && itemData.url_hints.item_type === 'a' && itemData.url_hints.slug) {
					// add album name / url
					// TODO the only album name we can get from this endpoint is the slug
					//  so update this whenever we get that piece of data
					item.albumURL = this.cleanUpURL(UrlUtils.resolve(item.url, '/album/'+itemData.url_hints.slug));
					item.albumName = null;
					item.albumSlug = itemData.url_hints.slug;
				}
			}

			// build item list node
			itemNode.item = item;
			if(itemData.item_id) {
				itemNode.itemId = itemData.item_id;
			}
			if(itemData.why != null) {
				itemNode.userComment = itemData.why;
			}
			return itemNode;
		});
	}


	parseFanPageDataBandsSectionJson(listData, itemCache, existingSection) {
		return this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier) => {
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				return null;
			}
			// build basic item data
			let item = {
				type: 'artist',
				id: itemData.band_id,
				name: itemData.name,
				location: itemData.location
			}
			// add item url
			if(itemData.url_hints) {
				if(itemData.url_hints.custom_domain) {
					item.url = this.cleanUpURL(`https://${itemData.url_hints.custom_domain}`);
				} else if(itemData.url_hints.subdomain) {
					item.url = this.cleanUpURL(`https://${itemData.url_hints.subdomain}.bandcamp.com`);
				}
			}
			// add images
			if(itemData.image_id) {
				const imageId = this.padImageId(itemData.image_id);
				item.images = this.createImagesFromImageId(itemData.image_id);
			}
			// build item list node
			const itemNode = {
				item: item,
				token: itemData.token
			};
			if(itemData.date_followed) {
				const dateFollowed = new Date(itemData.date_followed);
				if(dateFollowed instanceof Date && !Number.isNaN(dateFollowed.getTime())) {
					itemNode.dateFollowed = dateFollowed.toISOString();
				} else {
					itemNode.dateFollowed = itemData.date_followed;
				}
			}
			return itemNode;
		});
	}

	parseFanPageDataFansSectionJson(listData, itemCache, existingSection) {
		return this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier) => {
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				return null;
			}
			// build basic item data
			let item = {
				type: 'fan',
				id: itemData.fan_id,
				url: itemData.trackpipe_url,
				name: itemData.name,
				location: itemData.location
			}
			// add images
			if(itemData.image_id) {
				const imageId = this.padImageId(itemData.image_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			// build item list node
			const itemNode = {
				item: item,
				token: itemData.token
			};
			if(itemData.date_followed) {
				const dateFollowed = new Date(itemData.date_followed);
				if(dateFollowed instanceof Date && !Number.isNaN(dateFollowed.getTime())) {
					itemNode.dateFollowed = dateFollowed.toISOString();
				} else {
					itemNode.dateFollowed = itemData.date_followed;
				}
			}
			return itemNode;
		});
	}



	parseFanCollectionHtml($, sectionSlug='collection') {
		const section = {};
		// parse items
		if($(`#${sectionSlug}-items`).index() !== -1) {
			const items = [];
			$(`#${sectionSlug}-items > ol.collection-grid > li`).each((index, itemHtml) => {
				const html = $(itemHtml);
				// parse item type
				let itemType = html.attr('data-itemtype');
				if(itemType === 'song') {
					itemType = 'track';
				} else if(itemType == 'band') {
					itemType = 'artist';
				}
				// build basic item data
				let item = {
					type: itemType,
					name: html.attr('data-title')
				};
				// parse name (again, just in case we don't have it)
				let name = html.find('.collection-item-title').first().contents().filter(function(){ return this.nodeType === 3; }).text().trim();
				if(name) {
					item.name = name;
				}
				// parse artist name
				let artistName = html.find('.collection-item-artist').first().contents().filter(function(){ return this.nodeType === 3; }).text().trim();
				const artistPrefix = 'by ';
				if(artistName.startsWith(artistPrefix)) {
					artistName = artistName.substring(artistPrefix.length);
				}
				// build URLs
				const url = html.find('a.item_link').attr('href');
				if(url) {
					const urlItemType = this.parseType(url);
					if(itemType === 'track' && urlItemType === 'album') {
						item.albumURL = this.cleanUpURL(url);
						const lastSlashIndex = item.albumURL.lastIndexOf('/');
						if(lastSlashIndex !== -1) {
							item.albumSlug = item.albumURL.substring(lastSlashIndex+1);
						}
					} else {
						item.url = this.cleanUpURL(url);
					}
					item.artistURL = this.cleanUpURL(UrlUtils.resolve(item.url, '/'));
				}
				// add slug URL if url is missing
				if(!item.url && item.name && (itemType === 'track' || itemType === 'album')) {
					item.url = this.cleanUpURL(`https://bandcamp.com/${itemType}/${this.slugify(item.name)}`);
				}
				// add images
				const imageURL = html.find('img.collection-item-art').attr('src');
				if(imageURL) {
					item.images = [
						{
							url: imageURL,
							size: 'large'
						}
					];
				}
				// build list item node
				const itemNode = {
					item: item
				};
				// parse id
				let itemId = html.attr('data-itemid');
				if(itemId) {
					itemNode.itemId = itemId;
				}
				// add token / date added
				const token = html.attr('data-token');
				if(token) {
					itemNode.token = token;
					const tokenTimestamp = Number.parseFloat((''+token).split(':')[0]);
					if(!Number.isNaN(tokenTimestamp)) {
						const dateAdded = new Date(tokenTimestamp * 1000);
						if(dateAdded instanceof Date && !Number.isNaN(dateAdded.getTime())) {
							itemNode.dateAdded = dateAdded.toISOString();
						}
					}
				}
				// append item node
				items.push(itemNode);
			});
			section.items = items;
		}
		// parse count
		const count = Number.parseInt($(`#grid-tabs li[data-tab="${sectionSlug}"] .count`).text().trim());
		if(!Number.isNaN(count)) {
			section.itemCount = count;
		}
		return section;
	}


	parseFanHtml(url, $) {
		let fan = {};

		// parse fan username from url
		let urlParts = UrlUtils.parse(url);
		let username = urlParts.pathname;
		while(username.startsWith('/')) {
			username = username.substring(1);
		}
		username = username.split('/')[0];
		if(username) {
			fan.url = 'https://bandcamp.com/'+username;
			fan.username = username;
		}

		// parse fan info html
		let images = [];
		const fanImagePopupLink = $('#fan-container .fan-bio-photo a.popupImage[href]').first().attr('href');
		if(fanImagePopupLink) {
			images.push({
				url: fanImagePopupLink,
				size: 'large'
			});
		}
		const fanBioPicSrc = $('#fan-container .fan-bio-pic img').first().attr('src');
		if(fanBioPicSrc) {
			images.push({
				url: fanBioPicSrc,
				size: 'small'
			});
		}
		if(images.length > 0) {
			fan.images = images;
		}
		const name = $('#fan-container .fan-bio-inner .name span[data-bind="text: name"]').text().trim();
		if(name) {
			fan.name = name;
		}

		// parse sections html
		fan.collection = this.parseFanCollectionHtml($,'collection');
		fan.wishlist = this.parseFanCollectionHtml($,'wishlist');
		
		// parse pageData json
		let pageData = null;
		try {
			const pageDataString = $('#pagedata').attr('data-blob');
			if(pageDataString) {
				pageData = JSON.parse(pageDataString);
			}
		} catch(error) {
			// continue on
		}
		if(pageData) {
			// parse fan data
			fan = this.parseFanPageDataFanJson(pageData.fan_data, fan);

			// build fan media sections
			const itemCache = pageData.item_cache || {};
			const trackLists = pageData.tracklists || {};
			fan.collection = this.parseFanPageDataMediaSectionJson(pageData.collection_data, itemCache.collection, trackLists.collection, fan.collection);
			fan.wishlist = this.parseFanPageDataMediaSectionJson(pageData.wishlist_data, itemCache.wishlist, trackLists.wishlist, fan.wishlist);
			// build fan artist sections
			fan.followingArtists = this.parseFanPageDataBandsSectionJson(pageData.following_bands_data, itemCache.following_bands);
			// build fan sections
			fan.followingFans = this.parseFanPageDataFansSectionJson(pageData.following_fans_data, itemCache.following_fans);
			fan.followers = this.parseFanPageDataFansSectionJson(pageData.followers_data, itemCache.followers);
		}
		
		return fan;
	}
}



module.exports = BandcampParser;
