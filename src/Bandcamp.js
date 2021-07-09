
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
		const isBandcampDomain = this._parser.isUrlBandcampDomain(url);
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
		// load fan page
		const { res, data } = await this.sendHttpRequest(fanURL);
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusMessage);
		}
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		// load collection summary
		const collectionSummaryURL = 'https://bandcamp.com/api/fan/2/collection_summary';
		const { res: resCs, data: dataCs } = await this.sendHttpRequest(collectionSummaryURL, {
			headers: {
				'Referer': fanURL,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
			}
		});
		// parse fan
		const fan = await this._parser.parseFanHtmlData(fanURL, data, dataCs);
		// load and parse wishlist
		const wishlistURL = fanURL+'/wishlist';
		const { res: resWl, data: dataWl } = await this.sendHttpRequest(wishlistURL);
		if(!dataWl) {
			throw new Error("Unable to get wishlist data from url");
		}
		const fan2 = await this._parser.parseFanHtmlData(wishlistURL, dataWl);
		if(fan2.wishlist) {
			fan.wishlist = fan2.wishlist;
		}
		return fan;
	}


	async getMyIdentities() {
		const url = 'https://bandcamp.com/';
		const { res, data } = await this.sendHttpRequest(url);
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusMessage);
		}
		if(!data) {
			throw new Error("Unable to get identity data");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get identity data");
		}
		// parse response
		const $ = cheerio.load(dataString);
		return this._parser.parseIdentitiesFromPage($);
	}



	async _getFanSectionItems(apiURL, referrer, fanURL, fanId, { olderThanToken, count }, resultParser) {
		if(!fanURL || !fanId || !olderThanToken) {
			throw new Error("missing required parameters for _getFanSectionItems");
		}
		if(!this._auth.session) {
			// go to fan page first to acquire cookies
			await this.getFan(fanURL);
		}

		// make sure fanId is an integer
		fanId = this._parser.convertToNumberIfAble(fanId);
		// build body
		const body = {
			fan_id: fanId
		};
		if(olderThanToken) {
			body.older_than_token = olderThanToken;
		} else {
			body.older_than_token = `${Math.floor((new Date()).getTime()/1000)+3600}::t::`;
		}
		if(count != null) {
			body.count = count;
		} else {
			body.count = 20;
		}
		const jsonBody = JSON.stringify(body);
		const { res, data } = await this.sendHttpRequest(apiURL, {
			method: 'POST',
			body: jsonBody,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded', // Bandcamp doesn't set the content type on the request code, so it's not application/json
				'Content-Length': jsonBody.length,
				'Origin': 'https://bandcamp.com',
				'Referer': referrer,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		return resultParser(res, data);
	}

	async getFanCollectionItems(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/collection_items',
			fanURL, fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanWishlistItems(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/wishlist_items',
			fanURL+'/wishlist', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanHiddenItems(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/hidden_items',
			fanURL, fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanFollowingArtists(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/following_bands',
			fanURL+'/following/artists_and_labels', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionArtistsJsonData(res,data);
			});
	}

	async getFanFollowingFans(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/following_fans',
			fanURL+'/following/fans', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionFansJsonData(res,data);
			});
	}

	async getFanFollowers(fanURL, fanId, { olderThanToken, count }) {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/followers',
			fanURL+'/followers', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionFansJsonData(res,data);
			});
	}



	async _performArtistFollowAction(artistURL, action) {
		artistURL = this._parser.cleanUpURL(artistURL);
		const isBandcampDomain = this._parser.isUrlBandcampDomain(artistURL);
		let fanId = null;
		if(!isBandcampDomain) {
			// get fan ID from homepage
			const { fan } = await this.getMyIdentities();
			if(!fan) {
				throw new Error("Could not find current user's fan identity");
			}
			fanId = fan.id;
		}
		// get data from artist url
		const { res, data } = await this.sendHttpRequest(artistURL);
		if(!data) {
			throw new Error("Unable to get data from artist url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from artist url");
		}
		// parse response
		const $ = cheerio.load(dataString);
		const artist = this._parser.parseItemFromURL(url, 'artist', $);
		if(artist == null) {
			if(res.statusCode >= 200 && res.statusCode < 300) {
				throw new Error("Failed to parse artist page");
			} else {
				throw new Error(res.statusCode+": "+res.statusMessage);
			}
		}
		const bandId = artist.id;
		// parse fan identity
		if(isBandcampDomain) {
			const { fan } = this._parser.parseIdentitiesFromPage($);
			if(!fan) {
				throw new Error("Could not find current user's fan identity on artist page");
			}
			fanId = fan.id;
		}
		// ensure fanId is set
		if(!fanId) {
			throw new Error("couldn't parse fan ID");
		}
		// ensure bandId is set
		if(!bandId) {
			throw new Error("couldn't parse band ID");
		}
		// create post body object
		const reqBodyObj = {
			fan_id: fanId,
			band_id: bandId,
			action: action
		};
		// parse ref_token
		const refToken = this._parser.parseReferrerToken($);
		if(action === 'follow') {
			if(!refToken) {
				throw new Error("couldn't parse ref token");
			}
			reqBodyObj.ref_token = refToken;
		}
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const headers = {
			'Content-Length': reqBody.length,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Referer': `${artistURL}/`,
			'Origin': artistURL,
			'Sec-Fetch-Dest': 'empty',
			'Sec-Fetch-Mode': 'cors',
			'X-Requested-With': 'XMLHttpRequest'
		}
		let returnedData = undefined;
		if(isBandcampDomain) {
			const { res, data } = await this.sendHttpRequest(`${artistURL}/fan_follow_band_cb`, {
				headers: {
					...headers,
					'Sec-Fetch-Site': 'same-origin'
				},
				body: reqBody
			});
			if(res.statusCode < 200 || res.statusCode >= 300) {
				throw new Error(res.statusCode+': '+res.statusMessage);
			}
			returnedData = data;
		} else {
			const { res, data } = await this.sendHttpRequest('https://bandcamp.com/fan_follow_band_cb', {
				headers: {
					...headers,
					'Sec-Fetch-Site': 'cross-site'
				},
				body: reqBody
			});
			if(res.statusCode < 200 || res.statusCode >= 300) {
				throw new Error(res.statusCode+': '+res.statusMessage);
			}
			returnedData = data;
		}
		// return result json
		const retDataString = returnedData.toString();
		const result = JSON.parse(retDataString);
		if(typeof result.ok === 'boolean' && !result.ok) {
			if(result.error_message) {
				throw new Error(result.error_message);
			} else {
				throw new Error("Artist "+action+" request failed:\n"+JSON.stringify(result,null,'\t'));
			}
		}
		return result;
	}

	async followArtist(artistURL) {
		return await this._performArtistFollowAction(artistURL, 'follow');
	}

	async unfollowArtist(artistURL) {
		return await this._performArtistFollowAction(artistURL, 'unfollow');
	}



	async _performFanFollowAction(fanURL, action) {
		// get data from fan url
		let { res, data } = await this.sendHttpRequest(fanURL);
		if(!data) {
			throw new Error("Unable to get data from fan url");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from fan url");
		}
		// parse response
		const $ = cheerio.load(dataString);
		const pageData = JSON.parse($('#pagedata').attr('data-blob'));
		const myFanId = this._parser.parseIdentitiesFromJson(pageData).fan.id;
		if(!myFanId) {
			throw new Error("could not parse current fan id");
		}
		const targetFanId = pageData.fan_data.fan_id;
		if(!targetFanId) {
			throw new Error("could not parse target fan id");
		}
		const crumbsData = JSON.parse($('#js-crumbs-data').attr('data-crumbs'));
		// create post request
		const reqBodyObj = {
			fan_id: myFanId,
			follow_id: targetFanId,
			action: action,
			crumb: crumbsData.fan_follow_cb
		};
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const reqResult = await this.sendHttpRequest('https://bandcamp.com/fan_follow_cb', {
			headers: {
				'Content-Length': reqBody.length,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Referer': `${fanURL}/`,
				'Origin': 'https://bandcamp.com',
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: reqBody
		});
		res = reqResult.res;
		data = reqResult.data;
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusCode+': '+res.statusMessage);
		}
		// return result json
		const retDataString = data.toString();
		const result = JSON.parse(retDataString);
		if(typeof result.ok === 'boolean' && !result.ok) {
			if(result.error_message) {
				throw new Error(result.error_message);
			} else {
				throw new Error("Artist "+action+" request failed:\n"+JSON.stringify(result,null,'\t'));
			}
		}
		return result;
	}

	async followFan(fanURL) {
		return await this._performFanFollowAction(fanURL, 'follow');
	}

	async unfollowFan(fanURL) {
		return await this._performFanFollowAction(fanURL, 'unfollow');
	}
}


Bandcamp.Auth = BandcampAuth;
Bandcamp.Session = BandcampSession;
Bandcamp.Parser = BandcampParser;


module.exports = Bandcamp;
