
const { Buffer } = require('buffer');
const http = require('http');
const https = require('https');
const UrlUtils = require('url');


module.exports.sendHttpRequest = (url, options={}) => {
	return new Promise((resolve, reject) => {
		// build request data
		url = UrlUtils.parse(url);
		const reqData = {
			protocol: url.protocol,
			hostname: url.hostname,
			path: url.pathname + (url.search || ''),
			agent: false,
			withCredentials: false,
			headers: {
				//"User-Agent": "miniweb",
				"Accept": "*/*",
				"Host": url.hostname
			}
		};
		if(Number.isInteger(url.port)) {
			reqData.port = url.port;
		}
		
		// attach options
		if(options.method) {
			reqData.method = options.method;
		} else {
			reqData.method = 'GET';
		}
		if(options.headers) {
			reqData.headers = {...options.headers};
		}

		// create request
		const protocolObj = (url.protocol === 'https:' || url.protocol === 'https') ? https : http;
		const req = protocolObj.request(reqData, (res) => {
			// build response
			let buffers = [];
			res.on('data', (chunk) => {
				buffers.push(chunk);
			});

			res.on('end', () => {
				// parse response
				let data = null;
				try {
					data = Buffer.concat(buffers);
				}
				catch(error) {
					error.response = res;
					error.data = result;
					reject(error);
					return;
				}
				resolve({ res, data });
			});
		});

		// handle error
		req.on('error', (error) => {
			reject(error);
		});

		// send
		req.end();
	});
}