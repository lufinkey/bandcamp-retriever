
const QueryString = require('querystring');
const UrlUtils = require('url');
const cheerio = require('cheerio');
const { sendHttpRequest } = require('./Utils');
const BandcampAuth = require('./Auth');
const BandcampSession = require('./Session');
const BandcampParser = require('./Parser');


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

	loginWithSession(session) {
		return this._auth.loginWithSession(session);
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
		// add auth headers
		const isBandcampDomain = this._parser.isUrlBandcampDomain(url);
		const refererURL = (options.headers ? options.headers['Referer'] : null);
		let headers = {};
		if(isBandcampDomain) {
			let sameSiteReferrer = true;
			if(refererURL) {
				const refererIsBandcampDomain = this._parser.isUrlBandcampDomain(refererURL);
				if(!refererIsBandcampDomain) {
					sameSiteReferrer = false;
				}
			}
			if(sameSiteReferrer) {
				headers = {
					...headers,
					...this._auth.getSameSiteRequestHeaders(url)
				};
			} else {
				headers = {
					...headers,
					...this._auth.getCrossSiteRequestHeaders(url)
				};
			}
		}
		if(options.headers) {
			headers = {
				...headers,
				...options.headers
			};
		}
		// send request
		const { res, data } = await sendHttpRequest(url, {
			...options,
			headers: headers
		});
		// udpate session if needed
		if(isBandcampDomain) {
			this._updateSessionFromResponse(res);
		}
		// return result
		return { res, data };
	}



	async search(query, options={}) {
		// create and send request
		const params = {
			...options,
			q: query
		};
		const url = "https://bandcamp.com/search?"+QueryString.stringify(params);
		const { res, data } = await this.sendHttpRequest(url);
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
		// perform request
		const { res, data } = await this.sendHttpRequest(url);
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		// parse response
		const $ = cheerio.load(dataString);
		const item = this._parser.parseItemFromURL(url, options.type, $);
		if(item == null) {
			if(res.statusCode >= 200 && res.statusCode < 300) {
				throw new Error("Failed to parse item");
			} else {
				throw new Error(res.statusCode+": "+res.statusMessage);
			}
		}
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
		const { res, data } = await this.sendHttpRequest(streamsURL, {
			headers: {
				'Pragma': 'no-cache',
				'Referer': refererURL,
				'Sec-Fetch-Dest': 'script',
				'Sec-Fetch-Mode': 'no-cors',
				'Sec-Fetch-Site': 'cross-site'
			}
		});
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

	async getFan(fanURL, options={}) {
		const { res, data } = await this.sendHttpRequest(fanURL);
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const fan = await this._parser.parseFanHtmlData(fanURL, data);
		const wishlistURL = fanURL+'/wishlist';
		const { res: res2, data: data2 } = await this.sendHttpRequest(wishlistURL);
		if(!data2) {
			throw new Error("Unable to get wishlist data from url");
		}
		const fan2 = await this._parser.parseFanHtmlData(wishlistURL, data2);
		if(fan2.wishlist) {
			fan.wishlist = fan2.wishlist;
		}
		return fan;
	}


	async getMyIdentities() {
		const url = "https://bandcamp.com/";
		const { res, data } = await this.sendHttpRequest(url);
		// parse response
		const $ = cheerio.load(dataString);
		return this._parser.parseIdentitiesFromPage($);
	}
	


	async getFanCollectionItems(fanURL, fanId, olderThanToken, count=20) {
		if(!fanURL || !fanId || !olderThanToken) {
			throw new Error("missing required parameters for getFanCollectionItems");
		}
		if(!this._auth.session) {
			// go to fan page first to acquire cookies
			await this.getFan(fanURL);
		}

		const body = {
			fan_id: fanId
		};
		if(olderThanToken) {
			body.older_than_token = olderThanToken;
		}
		if(count != null) {
			body.count = count;
		}
		const jsonBody = JSON.stringify(body);
		const url = 'https://bandcamp.com/api/fancollection/1/collection_items';
		const { res, data } = await this.sendHttpRequest(url, {
			method: 'POST',
			body: jsonBody,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded', // Bandcamp doesn't set the content type on the request code, so it's not application/json
				'Content-Length': jsonBody.length,
				'Origin': 'https://bandcamp.com',
				'Referer': fanURL,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusMessage);
		}

		const resJson = JSON.parse(res);
		return this._parser.parseFanCollectionItemsJson(resJson);
	}


	async getFanWishlistItems(fanURL, fanId, olderThanToken, count=20) {
		if(!fanURL || !fanId || !olderThanToken) {
			throw new Error("missing required parameters for getFanWishlistItems");
		}
		if(!this._auth.session) {
			// go to fan page first to acquire cookies
			await this.getFan(fanURL);
		}

		const body = {
			fan_id: fanId
		};
		if(olderThanToken) {
			body.older_than_token = olderThanToken;
		}
		if(count != null) {
			body.count = count;
		}
		const jsonBody = JSON.stringify(body);
		const url = 'https://bandcamp.com/api/fancollection/1/wishlist_items';
		const { res, data } = await this.sendHttpRequest(url, {
			method: 'POST',
			body: jsonBody,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded', // Bandcamp doesn't set the content type on the request code, so it's not application/json
				'Content-Length': jsonBody.length,
				'Origin': 'https://bandcamp.com',
				'Referer': `${fanURL}/wishlist`,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusMessage);
		}

		const resJson = JSON.parse(res);
		return this._parser.parseFanCollectionItemsJson(resJson);
	}
}


Bandcamp.Auth = BandcampAuth;
Bandcamp.Session = BandcampSession;
Bandcamp.Parser = BandcampParser;


module.exports = Bandcamp;
