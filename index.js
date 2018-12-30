
const { Buffer } = require('buffer');
const https = require('https');
const QueryString = require('querystring');
const cheerio = require('cheerio');


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
		const html = cheerio.load(data.toString());
		const resultItems = html('ul.result-items > li');
		let items = [];
		resultItems.each((index, resultItem) => {
			let resultItemHtml = html(resultItem);

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
				imageUrl: resultItemHtml.find('.art img').attr('src') || null,
				tags: (() => {
					let tags = resultItemHtml.find('.tags').text().trim().replace(new RegExp('^tags:'), '').trim().replace(/\s/g, '');
					return (tags.length > 1) ? tags.split(',') : [];
				})(),
				genre: resultItemHtml.find('.genre').text().trim().replace(new RegExp('^genre:'), '').trim().replace(/\s{2,}/g, ' ') || null,
				releaseDate: resultItemHtml.find('.released').text().trim().replace(new RegExp('^released '), '').trim() || null
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
					//
				}
				break;

				case 'album': {
					item.numTracks = (() => {
						let info = resultItemHtml.find('.length').text().trim().split(',');
						if(info.length !== 2) {
							return undefined;
						}
						return parseInt(info[0].replace(' tracks$', ''));
					})();
					item.numMinutes = (() => {
						let info = resultItemHtml.find('.length').text().trim().split(',');
						if(info.length !== 2) {
							return undefined;
						}
						return parseInt(info[1].replace(' minutes$', ''));
					})();
				}
				break;
			}

			items.push(item);
		});
		return items;
	}
}


module.exports = Bandcamp;
