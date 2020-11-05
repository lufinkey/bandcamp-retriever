
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
		const headers = {
			...this._auth.getSameSiteRequestHeaders(url)
		};
		if(options.headers) {
			headers = {
				...headers,
				...options.headers
			};
		}
		const { res, data } = await this.sendHttpRequest(url, {headers:headers});
		this._updateSessionFromResponse(res);
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
		let headers = {};
		const isBandcampDomain = this._parser.isUrlBandcampDomain(url);
		if(isBandcampDomain) {
			headers = {
				...headers,
				...this._auth.getSameSiteRequestHeaders(url)
			};
		}
		if(options.headers) {
			headers = {
				...headers,
				...options.headers
			};
		}
		const { res, data } = await this.sendHttpRequest(url, {headers:headers});
		if(isBandcampDomain) {
			this._updateSessionFromResponse(res);
		}
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		const item = this._parser.parseItemFromURL(url, options.type, $);
		// if we're logged in and missing some audio streams,
		//  and if the link isn't a bandcamp subdomain
		//  then fetch the missing audio files
		if(this._auth.isLoggedIn && !isBandcampDomain
		   && (item.type === 'track'
		    || (item.type === 'album' && item.tracks && item.tracks.length > 0))) {
			let missingAudioSources = false;
			if((item.type == 'track' && (!item.audioSources || item.audioSources.length === 0))
			   || (item.type === 'album' && item.tracks && item.tracks.find((track) => (!track.audioSources || track.audioSources.length === 0)))) {
				missingAudioSources = true;
			}
			if(missingAudioSources) {
				const cdUIURL = this._parser.parseCDUILink($);
				const streams = await this._fetchItemStreams(cdUIURL, url);
				if(streams) {
					if(item.type === 'track') {
						this._parser.attachStreamsToTracks([item], streams);
					} else if(item.type === 'album' && item.tracks) {
						this._parser.attachStreamsToTracks(item.tracks, streams);
					}
				}
			}
		}
		return item;
	}

	async _fetchItemStreams(streamsURL, refererURL) {
		const headers = {
			...this._auth.getCrossSiteRequestHeaders(streamsURL),
			'Pragma': 'no-cache',
			'Referer': refererURL,
			'Sec-Fetch-Dest': 'script',
			'Sec-Fetch-Mode': 'no-cors',
			'Sec-Fetch-Site': 'cross-site'
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
