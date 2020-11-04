
const UrlUtils = require('url');
const cheerio = require('./external/cheerio');
const { getDurationFromText } = require('./Utils');



class BandcampParser {
	createFetchResult(res, data) {
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
		return {
			headers: headers,
			data: data
		};
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
		return UrlUtils.format(urlParts);
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
		console.log("itemName = "+itemName);

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
						const duration = getDurationFromText(durationText);
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
			let item = this.parseTrackInfo(url, $);
			if(!item) {
				throw new Error("Unable to parse track data");
			}
			item.artist = this.parseArtistInfo(url, $);
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
}



module.exports = BandcampParser;
