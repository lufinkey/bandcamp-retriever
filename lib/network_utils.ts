
import { Buffer } from 'buffer';
import http from 'http';
import https from 'https';
import * as UrlUtils from 'url';


export type SendHttpRequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'
	headers?: http.OutgoingHttpHeaders
	body?: Buffer | string | null
	redirectCount?: number
	maxRedirects?: number
}

type HttpClient = {
	request: (opts: http.RequestOptions, callback: (res: http.IncomingMessage) => void) => http.ClientRequest
}

export type HttpResponse = http.IncomingMessage & {
	statusCode: number,
	statusMessage: string
}

type HttpResult = {
	res: HttpResponse
	data: Buffer
}

export const sendHttpRequest = (url: string, options: SendHttpRequestOptions = {}): Promise<HttpResult> => {
	options = {...options};
	return new Promise((resolve, reject) => {
		// build request data
		const urlObj = UrlUtils.parse(url);
		const reqData: http.RequestOptions = {
			protocol: urlObj.protocol,
			hostname: urlObj.hostname,
			path: urlObj.pathname + (urlObj.search || ''),
			agent: false,
			headers: {
				//"User-Agent": "miniweb",
				"Accept": "*/*",
				"Host": urlObj.hostname ?? undefined
			}
		};
		// add withCredentials: false to prevent automatic property setting
		(reqData as any).withCredentials = false;
		// attach port if needed
		if(Number.isInteger(urlObj.port)) {
			reqData.port = urlObj.port;
		}
		
		// attach options
		if(options.method) {
			reqData.method = options.method;
		} else {
			reqData.method = 'GET';
		}
		if(options.headers) {
			reqData.headers = { ...reqData.headers, ...options.headers };
		}
		
		// create request
		let errored = false;
		const protocolObj: HttpClient = (urlObj.protocol === 'https:' || urlObj.protocol === 'https') ? https : http;
		const req = protocolObj.request(reqData, (res: http.IncomingMessage) => {
			// ensure status code
			if(res.statusCode == null) {
				if(errored) {
					return;
				}
				reject(new Error("Missing statusCode in response"));
				return;
			}
			else if(res.statusMessage == null) {
				res.statusMessage = `${res.statusCode}`;
			}
			// handle redirect
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
			let buffers: Buffer[] = [];
			res.on('data', (chunk: Buffer) => {
				buffers.push(chunk);
			});

			res.on('end', () => {
				if(errored) {
					return;
				}
				// parse response
				let data = null;
				try {
					data = Buffer.concat(buffers);
				}
				catch(error: any) {
					error.response = res;
					error.data = null;
					reject(error);
					return;
				}
				resolve({ res: res as HttpResponse, data });
			});
		});

		// handle error
		req.on('error', (error: Error) => {
			if(errored) {
				return;
			}
			errored = true;
			reject(error);
		});

		// write data if needed
		if(options.body != null) {
			req.write(options.body);
		}

		// send
		req.end();
	});
}