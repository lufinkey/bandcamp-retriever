
const { Buffer } = require('buffer');
const https = require('https');
const QueryString = require('querystring');
const cheerio = require('cheerio');
const { URL } = require('url');


const sendHttpRequest = (url, options) => {
	options = {...options};
	return new Promise((resolve, reject) => {
		// build request data
		url = new URL(url);
		let path = url.pathname;
		if(url.search) {
			path = path + url.search;
		}
		const reqData = {
			protocol: url.protocol,
			hostname: url.hostname,
			port: url.port,
			path: path,
			method: options.method || 'GET',
			headers: options.headers || {}
		};

		// create request
		const req = https.request(reqData, (res) => {
			// build response
			let buffers = [];
			res.on('data', (chunk) => {
				buffers.push(chunk);
			});

			res.on('end', () => {
				// parse response
				const data = Buffer.concat(buffers);
				buffers = null;
				setTimeout(() => {
					resolve({ res: res, data: data });
				}, 0);
			});
		});

		// handle error
		req.on('error', (error) => {
			reject(error);
		});

		// send
		if(options.data !== undefined) {
			req.write(options.data);
		}
		req.end();
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
					let tags = resultItemHtml.find('.tags').text().trim().replace(new RegExp('^tags:'), '').trim().replace(/\s/g, '');
					return (tags.length > 1) ? tags.split(',') : [];
				})(),
				genre: resultItemHtml.find('.genre').text().trim().replace(new RegExp('^genre:'), '').trim().replace(/\s{2,}/g, ' ') || undefined,
				releaseDate: resultItemHtml.find('.released').text().trim().replace(new RegExp('^released '), '').trim() || undefined
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
						return parseInt(info[0].replace(new RegExp(' tracks$'), ''));
					})();
					item.numMinutes = (() => {
						let info = resultItemHtml.find('.length').text().trim().split(',');
						if(info.length !== 2) {
							return undefined;
						}
						return parseInt(info[1].replace(new RegExp(' minutes$'), ''));
					})();
				}
				break;
			}

			items.push(item);
		});
		return items;
	}


	async getInfoFromURL(trackURL) {
		const url = new URL(trackURL);

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

		const { res, data } = await sendHttpRequest(trackURL);
		const dataString = data.toString();
		const $ = cheerio.load(dataString);
		const nameSection = $('#name-section');

		const mp3URLs = [];
		const mp3Regex = /\{\"mp3-128\"\:\"(.+?(?=\"\}))\"\}/gmi;
		let mp3RegMatch = null;
		while(mp3RegMatch = mp3Regex.exec(dataString)) {
			mp3URLs.push(mp3RegMatch[1]);
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

		if(trackHtmls.length > 0) {
			item.tracks = trackHtmls.map((trackHtml, index) => {
				return {
					name: trackHtml.find('.title span[itemprop="name"]').text().trim(),
					duration: trackHtml.find('.title .time').text().trim() || undefined,
					audioURL: mp3URLs[index]
				};
			});
		}
		else if(mp3URLs.length > 0) {
			item.audioURL = mp3URLs[0];
		}

		return item;
	}
}



module.exports = Bandcamp;
