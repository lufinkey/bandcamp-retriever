
const QueryString = require('querystring');
const UrlUtils = require('url');
const cheerio = require('./external/cheerio');
const BandcampAuth = require('./Auth');
const BandcampParser = require('./Parser');
const { sendHttpRequest } = require('./Utils');


class Bandcamp {
	constructor(options={}) {
		this._auth = new BandcampAuth(options.auth || {});
		this._parser = new BandcampParser();
	}

	slugify(str) {
		return this._parser.slugify(str);
	}



	loginWithCookies(cookies) {
		return this._auth.loginWithCookies(cookies);
	}

	updateSessionCookies(cookies) {
		this._auth.updateSessionCookies(cookies);
	}

	logout() {
		this._auth.logout();
	}

	get session() {
		return this._auth.session;
	}

	_updateSessionFromResponse(res) {
		const headers = this._parser.parseResponseHeaders(res);
		let setCookiesHeaders = headers["Set-Cookie"];
		if(setCookiesHeaders) {
			if(!(setCookiesHeaders instanceof Array)) {
				setCookiesHeaders = [ setCookiesHeaders ];
			}
			this._auth.updateSessionCookies(setCookiesHeaders);
		}
	}



	async sendHttpRequest(url, options={}) {
		return await sendHttpRequest(url, options);
	}



	async search(query, options={}) {
		// create and send request
		const params = {
			...options,
			q: query
		};
		const url = "https://bandcamp.com/search?"+QueryString.stringify(params);
		const { res, data } = await this.sendHttpRequest(url, {headers:options.headers});
		if(!data) {
			throw new Error("Unable to get data from search url");
		}
		// parse result
		const searchResults = this._parser.parseSearchResultsData(url, data);
		return searchResults;
	}

	async getItemFromURL(url, options={}) {
		if(!options.type) {
			options.type = this._parser.parseType(url);
		}
		const { res, data } = await this.sendHttpRequest(url, {headers:options.headers});
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		const item = this._parser.parseItemFromURL(url, options.type, $);
		//const cdUIURL = this._parser.parseCDUILink($);
		//const streams = await this._fetchItemStreams(cdUIURL, url);
		return item;
	}

	async _fetchItemStreams(streamsURL, refererURL) {
		const headers = {
			...this._auth.requestHeaders,
			'Referer': refererURL,
			'Sec-Fetch-Dest': 'script',
			'Sec-Fetch-Mode': 'no-cors'
		};
		const { res, data } = await this.sendHttpRequest(streamsURL, {headers:headers});
		this._updateSessionFromResponse(res);
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		return this._parser.parseStreamFiles(data);
	}

	async getTrack(trackURL, options={}) {
		return await this.getItemFromURL(trackURL, {type:'track',...options});
	}

	async getAlbum(albumURL, options={}) {
		return await this.getItemFromURL(albumURL, {type:'album',...options});
	}

	async getArtist(artistURL, options={}) {
		return await this.getItemFromURL(UrlUtils.resolve(artistURL,'/music'), {type:'artist',...options});
	}
}



module.exports = Bandcamp;
