
import { Buffer } from 'buffer';
import http from 'http';
import https from 'https';
import { URL } from 'url';


export type SendHttpRequestOptions = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'OPTIONS'
	headers?: http.OutgoingHttpHeaders
	body?: Buffer | string | null
	redirectCount?: number
	maxRedirects?: number
}

type HttpClient = {
	request: (opts: https.RequestOptions, callback: (res: http.IncomingMessage) => void) => http.ClientRequest
}

export type HttpResponse = http.IncomingMessage & {
	statusCode: number,
	statusMessage: string
}

type HttpResult = {
	res: HttpResponse
	data: Buffer
}

export const createHTTPRequest = (url: string, options: SendHttpRequestOptions): { request: https.RequestOptions, client: HttpClient } => {
	// build request data
	const urlObj = new URL(url);
	const request: https.RequestOptions = {
		method: options.method ?? 'GET',
		protocol: urlObj.protocol,
		hostname: urlObj.hostname,
		path: urlObj.pathname + (urlObj.search || ''),
		agent: false,
		headers: {
			//"User-Agent": "miniweb",
			"Accept": "*/*",
			"Host": urlObj.hostname ?? undefined,
			...options.headers
		}
	};
	// add withCredentials: false to prevent automatic property setting (false is the default value for XMLHttpRequest)
	(request as any).withCredentials = false;
	// attach port if needed
	if(Number.isInteger(urlObj.port)) {
		request.port = urlObj.port;
	}
	// attach options
	return {
		request: request,
		client: (urlObj.protocol === 'https:' || urlObj.protocol === 'https') ? https : http
	};
};

export const performHttpRequest = <T>(url: string, options: SendHttpRequestOptions, callback: (res: HttpResponse, resolve: (result: T) => void, reject: (error: Error) => void) => void): Promise<T> => {
	options = {...options};
	return new Promise((resolve, reject) => {
		const { request, client } = createHTTPRequest(url, options);
		let errored = false;
		const req = client.request(request, (res: http.IncomingMessage) => {
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
				performHttpRequest(res.headers.location, options, callback).then(resolve,reject);
				return;
			}

			callback(res as HttpResponse, resolve, reject);
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
