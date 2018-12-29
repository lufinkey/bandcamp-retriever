
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
			const item = {
				type: resultItemHtml.find('.itemtype').text().toLowerCase().trim(),
				name: resultItemHtml.find('.heading').text().trim()
			};
			items.push(item);
		});
		return items;
	}
}


module.exports = Bandcamp;
