
const { Buffer } = require('buffer');
const https = require('https');
const QueryString = require('querystring');
const cheerio = require('cheerio-without-node-native');
const { parse: parseURL } = require('url');


const sendHttpRequest = (url, options) => {
	options = {...options};
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';
		xhr.onreadystatechange = () => {
			if(xhr.readyState === 4) {
				resolve({ data: Buffer.from(xhr.response) });
			}
		};
		xhr.onerror = (error) => {
			reject(error);
		};
		xhr.open(options.method || 'GET');
		if(options.body) {
			xhr.send(options.body);
		}
		else {
			xhr.send();
		}
	});
}


class Bandcamp {

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

			// parse general fields
			const item = {
				type: resultItemHtml.find('.itemtype').text().toLowerCase().trim(),
				name: resultItemHtml.find('.heading').text().trim(),
				url: resultItemHtml.find('.itemurl').text().trim(),
				imageUrl: resultItemHtml.find('.art img').attr('src') || undefined,
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
					item.artistName = subheads.find((subhead) => {
						return subhead.startsWith('by ');
					});
					if(item.artistName) {
						item.artistName = item.artistName.substring('by '.length).trim();
					}
					item.albumName = subheads.find((subhead) => {
						return subhead.startsWith('from ');
					});
					if(item.albumName) {
						item.albumName = item.albumName.substring('from '.length).trim();
					}
				}
				break;

				case 'artist': {
					item.location = (subheads.length > 0) ? subheads[0] : undefined;
				}
				break;

				case 'album': {
					item.artistName = subheads.find((subhead) => {
						return subhead.startsWith('by ');
					});
					if(item.artistName) {
						item.artistName = item.artistName.substring('by '.length).trim();
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

			items.push(item);
		});
		return items;
	}


	async getInfoFromURL(itemURL) {
		const url = parseURL(itemURL);

		let type = null;
		if(url.pathname) {
			if(url.pathname === '/') {
				type = 'artist';
			}
			else if(url.pathname.startsWith('/album/')) {
				type = 'album';
			}
			else if(url.pathname.startsWith('/track/')) {
				type = 'track';
			}
		}

		const { res, data } = await sendHttpRequest(itemURL);
		const dataString = data.toString();
		const $ = cheerio.load(dataString);
		const nameSection = $('#name-section');

		const mp3URLs = [];
		const mp3Regex = /\{\"mp3-128\"\:\"(.+?(?=\"\}))\"\}/gmi;
		let mp3RegMatch = null;
		while(mp3RegMatch = mp3Regex.exec(dataString)) {
			mp3URLs.push(JSON.parse(mp3RegMatch[0])["mp3-128"]);
		}

		let trackHtmls = [];
		$('#trackInfo .track_list .track_row_view').each((index, trackHtml) => {
			trackHtmls.push($(trackHtml));
		});

		const artistName = nameSection.find('span[itemprop="byArtist"]').text().trim();
		const albumName = nameSection.find('span[itemprop="inAlbum"]').text().trim();

		const item = {
			type: type,
			name: nameSection.find('.trackTitle').text().trim()
		};

		if(artistName) {
			item.artistName = artistName;
		}
		if(albumName) {
			item.albumName = albumName;
		}

		if(type === 'album') {
			item.tracks = trackHtmls.map((trackHtml, index) => {
				return {
					name: trackHtml.find('.title span[itemprop="name"]').text().trim(),
					duration: trackHtml.find('.title .time').text().trim() || undefined,
					audioURL: mp3URLs[index]
				};
			});
		}
		else if(type === 'track') {
			item.audioURL = mp3URLs[0];
		}

		return item;
	}


	async getArtistAlbums(artistURL) {
		const { res, data } = await sendHttpRequest(artistURL+'/music');
		const $ = cheerio.load(data.toString());

		const basicAlbumInfos = [];
		$('.music-grid > li').each((index, albumHtml) => {
			albumHtml = $(albumHtml);
			basicAlbumInfos.push({
				id: albumHtml.attr('data-item-id').replace(/^(album|track)-/, ''),
				name: albumHtml.find('.title').text().trim(),
				imageURL: albumHtml.find('.art img').attr('src')
			});
		});

		const albums = JSON.parse($('.music-grid').attr('data-initial-values'));
		return albums.map((album) => {
			const matchIndex = basicAlbumInfos.findIndex((albumInfo) => (albumInfo.id == album.id));
			let basicAlbumInfo = null;
			if(matchIndex !== -1) {
				basicAlbumInfo = basicAlbumInfos[matchIndex];
				basicAlbumInfos.splice(matchIndex, 1);
			}
			return {
				type: album.type,
				id: album.id,
				name: album.title,
				artistName: album.artist || album.band_name,
				url: album.page_url.startsWith('/') ? (artistURL+album.page_url) : album.page_url,
				imageURL: basicAlbumInfo ? basicAlbumInfo.imageURL : undefined,
				releaseDate: album.release_date,
				publishDate: album.publish_date
			};
		});
	}
}



module.exports = Bandcamp;
