
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
		this._fan = null;
		this._fanLoadNode = null;
		this._fanPromise = null;
	}

	slugify(str) {
		return this._parser.slugify(str);
	}



	loginWithCookies(cookies) {
		this._clearFanData();
		return this._auth.loginWithCookies(cookies);
	}

	loginWithSession(session) {
		this._clearFanData();
		return this._auth.loginWithSession(session);
	}

	updateSessionCookies(cookies) {
		this._auth.updateSessionCookies(cookies);
	}

	logout() {
		this._clearFanData();
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

	_clearFanData() {
		this._fan = null;
		if(this._fanLoadNode != null) {
			this._fanLoadNode.cancelled = true;
		}
		this._fanLoadNode = null;
		this._fanPromise = null;
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



	async _getCurrentFanInfo() {
		if(!this._auth.isLoggedIn) {
			return null;
		}
		if(this._fan) {
			return this._fan;
		}
		if(this._fanPromise != null) {
			return await this._fanPromise;
		}
		const loadNode = {cancelled: false};
		this._fanLoadNode = loadNode;
		this._fanPromise = (async () => {
			const { fan } = await this.getMyIdentities();
			if(loadNode.cancelled) {
				return null;
			}
			const fanInfo = {
				id: fan.id,
				url: fan.url,
				name: fan.name
			};
			this._fan = fanInfo;
			this._fanPromise = null;
			return fanInfo;
		})();
		this._fanPromise.catch((error) => {
			this._fanPromise = null;
		});
		return await this._fanPromise;
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
		if(!this._auth.isLoggedIn) {
			throw new Error("not logged in");
		}
		artistURL = this._parser.cleanUpURL(artistURL);
		const fanInfo = await this._getCurrentFanInfo();
		const isBandcampDomain = this._parser.isUrlBandcampDomain(artistURL);
		// get data from artist url
		let { res, data } = await this.sendHttpRequest(artistURL);
		if(!data) {
			throw new Error("Unable to get data from artist url");
		}
		let dataString = data.toString();
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
		// ensure fanId is set
		if(!fanInfo.id) {
			throw new Error("couldn't parse fan ID");
		}
		// ensure bandId is set
		if(!bandId) {
			throw new Error("couldn't parse band ID");
		}
		// create post body object
		const reqBodyObj = {
			fan_id: fanInfo.id,
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
		let apiURL = undefined;
		if(isBandcampDomain) {
			apiURL = `${artistURL}/fan_follow_band_cb`;
			headers['Sec-Fetch-Site'] = 'same-origin';
		} else {
			apiURL = 'https://bandcamp.com/fan_follow_band_cb';
			headers['Sec-Fetch-Site'] = 'cross-site';
		}
		const reqResult = await this.sendHttpRequest(apiURL, {
			method: 'POST',
			headers: headers,
			body: reqBody
		});
		res = reqResult.res;
		data = reqResult.data;
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusCode+': '+res.statusMessage);
		}
		// return result json
		dataString = data.toString();
		const result = JSON.parse(dataString);
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
		if(!this._auth.isLoggedIn) {
			throw new Error("not logged in");
		}
		fanURL = this._parser.cleanUpURL(fanURL);
		const fanInfo = await this._getCurrentFanInfo();
		// get data from fan url
		let { res, data } = await this.sendHttpRequest(fanURL);
		if(!data) {
			throw new Error("Unable to get data from fan url");
		}
		let dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from fan url");
		}
		// parse response
		const $ = cheerio.load(dataString);
		const pageData = JSON.parse($('#pagedata').attr('data-blob'));
		const targetFanId = pageData.fan_data.fan_id;
		const crumbsData = JSON.parse($('#js-crumbs-data').attr('data-crumbs'));
		// ensure current fan ID
		if(!fanInfo.id) {
			throw new Error("could not parse current fan id");
		}
		// ensure target fan ID
		if(!targetFanId) {
			throw new Error("could not parse target fan id");
		}
		// create post request
		const reqBodyObj = {
			fan_id: fanInfo.id,
			follow_id: targetFanId,
			action: action,
			crumb: crumbsData.fan_follow_cb
		};
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const reqResult = await this.sendHttpRequest('https://bandcamp.com/fan_follow_cb', {
			method: 'POST',
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
		dataString = data.toString();
		const result = JSON.parse(dataString);
		if(typeof result.ok === 'boolean' && !result.ok) {
			if(result.error_message) {
				throw new Error(result.error_message);
			} else {
				throw new Error("Fan "+action+" request failed:\n"+JSON.stringify(result,null,'\t'));
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



	async _performWishlistItemAction(itemURL, action) {
		if(!this._auth.isLoggedIn) {
			throw new Error("not logged in");
		}
		itemURL = this._parser.cleanUpURL(itemURL);
		const fanInfo = await this._getCurrentFanInfo();
		const callbackName = `${action}_item_cb`;
		const isBandcampDomain = this._parser.isUrlBandcampDomain(itemURL);
		// perform request to get item
		let { res, data } = await this.sendHttpRequest(itemURL);
		if(!data) {
			throw new Error("Unable to get data from item URL");
		}
		let dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from item URL");
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
		const bandId = item.artist.id;
		// ensure fan ID is set
		if(!fanInfo.id) {
			throw new Error("Could not parse fan ID");
		}
		// ensure item ID is set
		if(!item.id) {
			throw new Error("Could not parse item ID");
		}
		// ensure item type is set
		if(!item.type) {
			throw new Error("Could not parse item type");
		}
		// ensure band ID is set
		if(!bandId) {
			throw new Error("Could not parse item band ID");
		}
		// create post body object
		const reqBodyObj = {
			fan_id: fanInfo.id,
			band_id: bandId,
			item_id: item.id,
			item_type: item.type
		};
		// parse ref_token
		const refToken = this._parser.parseReferrerToken($);
		if(action === 'collect') {
			if(!refToken) {
				throw new Error("couldn't parse ref token");
			}
			reqBodyObj.ref_token = refToken;
		}
		// parse crumb
		if(isBandcampDomain) {
			const crumbsData = JSON.parse($('#js-crumbs-data').attr('data-crumbs'));
			if(crumbsData && crumbsData[callbackName]) {
				reqBodyObj.crumb = crumbsData[callbackName];
			}
		}
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const headers = {
			'Content-Length': reqBody.length,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': this._parser.cleanUpURL(UrlUtils.resolve(itemURL, '/')),
			'Referer': `${itemURL}/`,
			'Sec-Fetch-Dest': 'empty',
			'Sec-Fetch-Mode': 'cors',
			'X-Requested-With': 'XMLHttpRequest'
		};
		let apiURL = undefined;
		if(isBandcampDomain) {
			apiURL = UrlUtls.resolve(itemURL, `/${callbackName}`);
			headers['Sec-Fetch-Site'] = 'same-origin';
		} else {
			apiURL = `https://bandcamp.com/${callbackName}`;
			headers['Sec-Fetch-Site'] = 'cross-site';
		}
		const reqResult = await this.sendHttpRequest(apiURL, {
			method: 'POST',
			headers: headers,
			body: reqBody
		});
		res = reqResult.res;
		data = reqResult.data;
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusCode+': '+res.statusMessage);
		}
		// return result json
		dataString = data.toString();
		const result = JSON.parse(dataString);
		if(typeof result.ok === 'boolean' && !result.ok) {
			if(result.error_message) {
				throw new Error(result.error_message);
			} else {
				throw new Error("Item "+action+" request failed:\n"+JSON.stringify(result,null,'\t'));
			}
		}
		return result;
	}

	async wishlistItem(itemURL) {
		return await this._performWishlistItemAction(itemURL, 'collect');
	}

	async unwishlistItem(itemURL) {
		return await this._performWishlistItemAction(itemURL, 'uncollect');
	}



	async _performCollectionHideAction(itemURL, action) {
		if(!this._auth.isLoggedIn) {
			throw new Error("not logged in");
		}
		const apiEndpoint = 'api/collectionowner/1/hide_unhide_item';
		const fanInfo = await this._getCurrentFanInfo();
		// ensure fan URL is set
		if(!fanInfo.url) {
			throw new Error("Could not parse fan URL");
		}
		// perform both requests simultaneously
		const [ item, { crumb } ] = await Promise.all([
			// item request
			(async () => {
				// perform request to get item
				const { res, data } = await this.sendHttpRequest(itemURL);
				if(!data) {
					throw new Error("Unable to get data from item URL");
				}
				const dataString = data.toString();
				if(!dataString) {
					throw new Error("Unable to get data from item URL");
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
				return item;
			})(),
			// fan-page request
			(async () => {
				// perform request to get fan crumb data
				const { res, data } = await this.sendHttpRequest(fanInfo.url);
				if(!data) {
					throw new Error("Unable to get data from item URL");
				}
				const dataString = data.toString();
				if(!dataString) {
					throw new Error("Unable to get data from item URL");
				}
				// parse response
				const $ = cheerio.load(dataString);
				const crumbsData = JSON.parse($('#js-crumbs-data').attr('data-crumbs'));
				if(!crumbsData || !crumbsData[apiEndpoint]) {
					if(res.statusCode >= 200 && res.statusCode < 300) {
						throw new Error("Failed to parse crumb data");
					} else {
						throw new Error(res.statusCode+": "+res.statusMessage);
					}
				}
				return {
					crumb: crumbsData[apiEndpoint]
				};
			})()
		]);
		// ensure fan ID is set
		if(!fanInfo.id) {
			throw new Error("Could not parse fan ID");
		}
		// ensure item ID is set
		if(!item.id) {
			throw new Error("Could not parse item ID");
		}
		// ensure item type is set
		if(!item.type) {
			throw new Error("Could not parse item type");
		}
		// send post request
		const reqBody = JSON.stringify({
			fan_id: this._parser.convertToNumberIfAble(fanInfo.id),
			item_type: item.type,
			item_id: this._parser.convertToNumberIfAble(item.id),
			action: action,
			//collection_index: (action === 'unhide') ? 0 : null // TODO determine if we actually need this parameter
			crumb: crumb
		});
		const { res, data } = await this.sendHttpRequest(`https://bandcamp.com/${apiEndpoint}`, {
			method: 'POST',
			headers: {
				'Content-Length': reqBody.length,
				'Origin': this._parser.cleanUpURL(UrlUtils.resolve(itemURL, '/')),
				'Referer': `${fanInfo.url}/`,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: reqBody
		});
		// parse response
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusCode+': '+res.statusMessage);
		}
		const dataString = data.toString();
		const result = JSON.parse(dataString);
		if(typeof result.ok === 'boolean' && !result.ok) {
			if(result.error_message) {
				throw new Error(result.error_message);
			} else {
				throw new Error("Item "+action+" request failed:\n"+JSON.stringify(result,null,'\t'));
			}
		}
		return result;
	}

	async hideCollectionItem(itemURL) {
		return await this._performCollectionHideAction(itemURL, 'hide');
	}

	async unhideCollectionItem(itemURL) {
		return await this._performCollectionHideAction(itemURL, 'unhide');
	}
}


Bandcamp.Auth = BandcampAuth;
Bandcamp.Session = BandcampSession;
Bandcamp.Parser = BandcampParser;

module.exports = Bandcamp;
