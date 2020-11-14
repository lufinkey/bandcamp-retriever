
const { Buffer } = require('buffer');
const http = require('http');
const https = require('https');
const UrlUtils = require('url');


const sendHttpRequest = (url, options={}) => {
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
			if(res.statusCode >= 301 && res.statusCode < 400) {
				if(options.redirectCount == null) {
					options.redirectCount = 1;
				} else {
					options.redirectCount += 1;
				}
				let maxRedirects = 10;
				if(options.maxRedirects != null) {
					maxRedirects = options.maxRedirects;
				}
				if(options.redirectCount > maxRedirects) {
					reject(new Error("too many redirects"));
					return;
				}
				if(res.headers.location == null) {
					reject(new Error(res.statusCode+" status with no redirect"));
					return;
				}
				sendHttpRequest(res.headers.location, options).then(resolve,reject);
				return;
			}

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
module.exports.sendHttpRequest = sendHttpRequest;