
import http from 'http';;
import fs from 'fs';
import path from 'path';
import QueryString from 'querystring';
import UrlUtils from 'url';
import cheerio from 'cheerio';
import tough from 'tough-cookie';
import { BandcampSession } from './Session';
import { BandcampParser } from './Parser';
import {
	BandcampItemType,
	BandcampItemTypeChar,
	BandcampTrack,
	BandcampAlbum,
	BandcampArtist,
	BandcampAlbumTrack,
	BandcampFan,
	BandcampFan$CollectionPage,
	BandcampFan$FollowedArtistPage,
	BandcampFan$FollowedFanPage,
	BandcampFan$WishlistPage,
	BandcampFan$SearchMediaItemsPage,
	BandcampSearchResultsList,
	BandcampIdentities,
	BandcampAudioSource } from './types';
import { PrivBandcampAPI$Fan$CollectionSummary } from './private_types';
import {
	HttpResponse,
	sendHttpRequest,
	SendHttpRequestOptions,
	performHttpRequest } from './network_utils';
import { createPathForFile, formatTrackAudioFileOutputPath } from './media_utils';


const CRUMB_VALID_TIME = 5 * 60 * 1000;
const DefaultOutputStructure = '%(artistName)/%(albumName) [%(audioType)]/%(trackNumber:d2) %(name).%(fileExt)';


type BandcampOptions = {
	cookies?: (tough.Store | (tough.Cookie | string)[] | undefined)
};

type LoadNode = {
	cancelled: boolean
};

type FanInfo = {
	id: string
	url: string
	name: string
};


export class Bandcamp {
	static Session = BandcampSession;
	static Parser = BandcampParser;

	_session: BandcampSession
	_parser: BandcampParser

	_fan: FanInfo | null
	_fanLoadNode: LoadNode | null
	_fanPromise: Promise<FanInfo | null> | null
	_fanCrumbs: {[key: string]: string} | null
	_fanCrumbsFetchDate: Date | null
	_fanCrumbsLoadNode: LoadNode | null
	_fanCrumbsPromise: Promise<{[key: string]: string} | null> | null

	constructor(options: BandcampOptions = {}) {
		this._session = new BandcampSession(options.cookies);
		this._parser = new BandcampParser();

		this._fan = null;
		this._fanLoadNode = null;
		this._fanPromise = null;

		this._fanCrumbs = null;
		this._fanCrumbsFetchDate = null;
		this._fanCrumbsLoadNode = null;
		this._fanCrumbsPromise = null;
	}

	slugify(str: string): string {
		return this._parser.slugify(str);
	}
	
	async updateSessionCookies(cookies: (string | tough.Cookie)[]) {
		await this._session.updateBandcampCookies(cookies);
	}

	async clearSession() {
		this._clearFanData();
		await this._session.removeAllCookies();
	}

	get session(): BandcampSession | null {
		return this._session;
	}

	async getLoggedInStatus(): Promise<boolean> {
		return await this._session.getLoggedInStatus();
	}

	async _updateSessionFromResponse(res: HttpResponse, session: (BandcampSession | undefined)) {
		const headers = this._parser.parseResponseHeaders(res);
		let setCookiesHeaders = headers["Set-Cookie"];
		if(setCookiesHeaders) {
			if(!(setCookiesHeaders instanceof Array)) {
				setCookiesHeaders = [ setCookiesHeaders ];
			}
			await (session || this._session).updateBandcampCookies(setCookiesHeaders);
		}
	}



	async _createRequestHeaders(url: string, options: { headers?: http.OutgoingHttpHeaders, session?: BandcampSession }): Promise<{ isBandcampDomain: boolean, headers: http.OutgoingHttpHeaders }> {
		const session = options?.session || this._session;
		// add auth headers
		const isBandcampDomain = this._parser.isUrlBandcampDomain(url);
		let refererURL = (options.headers ? options.headers['Referer'] : null);
		if(refererURL instanceof Array) {
			refererURL = refererURL[0];
		}
		let headers = {};
		if(isBandcampDomain) {
			let sameSiteReferrer = true;
			if(typeof refererURL === 'string' && refererURL) {
				const refererIsBandcampDomain = this._parser.isUrlBandcampDomain(refererURL);
				if(!refererIsBandcampDomain) {
					sameSiteReferrer = false;
				}
			}
			if(sameSiteReferrer) {
				headers = {
					...headers,
					...(await session.getSameSiteRequestHeaders(url))
				};
			} else {
				headers = {
					...headers,
					...(await session.getCrossSiteRequestHeaders(url))
				};
			}
		}
		if(options.headers) {
			headers = {
				...headers,
				...options.headers
			};
		}
		return {
			isBandcampDomain,
			headers
		};
	}

	async sendHttpRequest(url: string, options?: (SendHttpRequestOptions & {session?: BandcampSession})): Promise<{res: HttpResponse, data: Buffer}> {
		// create options
		const { isBandcampDomain, headers } = await this._createRequestHeaders(url, {
			headers: options?.headers,
			session: options?.session,
		});
		const httpOptions = {
			...options,
			headers,
		};
		delete httpOptions.session;
		// send request
		const { res, data } = await sendHttpRequest(url, httpOptions);
		// update session if needed
		if(isBandcampDomain) {
			this._updateSessionFromResponse(res, options?.session).catch((error) => {
				console.error(error);
			});
		}
		// return result
		return { res, data };
	}

	async downloadFile(url: string, filepath: string, options?: { headers?: http.OutgoingHttpHeaders, session?: BandcampSession }): Promise<void> {
		const { isBandcampDomain, headers } = await this._createRequestHeaders(url, {
			headers: options?.headers,
			session: options?.session,
		});
		await performHttpRequest<void>(url, {
			method: 'GET',
			headers
		}, (res, resolve, reject) => {
			// update session if needed
			if(isBandcampDomain) {
				this._updateSessionFromResponse(res, options?.session).catch((error) => {
					console.error(error);
				});
			}
			// open file stream
			let file: fs.WriteStream;
			try {
				file = fs.createWriteStream(filepath);
			} catch(error: any) {
				reject(error);
				return;
			}
			file.on('open', () => {
				// write until finished
				res.pipe(file);
				// close the file when finished
				file.on('finish', () => {
					file.close();
					resolve();
				});
			});
			file.on('error', reject);
		});
	}



	_clearFanData() {
		// clear fan data
		this._fan = null;
		if(this._fanLoadNode != null) {
			this._fanLoadNode.cancelled = true;
		}
		this._fanLoadNode = null;
		this._fanPromise = null;
		// clear fan crumbs data
		this._fanCrumbs = null;
		if(this._fanCrumbsLoadNode != null) {
			this._fanCrumbsLoadNode.cancelled = true;
		}
		this._fanCrumbsFetchDate = null;
		this._fanCrumbsLoadNode = null;
		this._fanCrumbsPromise = null;
	}

	async _getCurrentFanInfo(): Promise<FanInfo | null> {
		if(!await this._session.getLoggedInStatus()) {
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
		this._fanPromise = (async (): Promise<FanInfo | null> => {
			// get identities
			const { fan } = await this.getMyIdentities();
			if(loadNode.cancelled) {
				return null;
			}
			if(!fan) {
				this._fanPromise = null;
				return null;
			}
			const fanInfo = {
				id: fan.id,
				url: fan.url,
				name: fan.name
			};
			// apply data
			this._fan = fanInfo;
			this._fanPromise = null;
			return fanInfo;
		})();
		this._fanPromise.catch((error) => {
			this._fanPromise = null;
		});
		return await this._fanPromise;
	}

	get _fanCrumbsValid() {
		if(this._fanCrumbs == null || this._fanCrumbsFetchDate == null) {
			return false;
		}
		return ((new Date()).getTime() - this._fanCrumbsFetchDate.getTime()) < CRUMB_VALID_TIME;
	}

	async _getCurrentFanPageCrumbs(): Promise<{[key: string]: string} | null> {
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			return null;
		}
		if(this._fanCrumbs != null && this._fanCrumbsValid) {
			return this._fanCrumbs;
		}
		if(this._fanCrumbsPromise != null) {
			return await this._fanCrumbsPromise;
		}
		const loadNode = {cancelled: false};
		this._fanCrumbsLoadNode = loadNode;
		const startFetchDate = new Date();
		this._fanCrumbsPromise = (async (): Promise<{[key: string]: string} | null> => {
			// get fan page data
			const { res, data } = await this.sendHttpRequest(fanInfo.url);
			if(loadNode.cancelled) {
				return null;
			}
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
			// get crumb info
			const crumbs = this._parser.parseCrumbs($);
			// apply data
			this._fanCrumbsFetchDate = startFetchDate;
			this._fanCrumbs = crumbs;
			this._fanCrumbsPromise = null;
			return crumbs;
		})();
		this._fanCrumbsPromise.catch((error) => {
			this._fanCrumbsPromise = null;
		});
		return await this._fanCrumbsPromise;
	}



	async search(query: string, options: { item_type?: (BandcampItemTypeChar|string), page?: number } = {}): Promise<BandcampSearchResultsList> {
		// create params
		const params: { [key: string]: string } = {};
		for(const key in options) {
			let val = (options as any)[key];
			if(val != null) {
				if(typeof val !== 'string') {
					val = val.toString();
				}
				params[key] = val;
			}
		}
		params['q'] = query;
		// send request
		const url = "https://bandcamp.com/search?"+QueryString.stringify(params);
		const { res, data } = await this.sendHttpRequest(url);
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusMessage);
		}
		if(!data) {
			throw new Error("Unable to get data from search url");
		}
		// parse result
		const searchResults = this._parser.parseSearchResultsData(url, data);
		return searchResults;
	}

	async getItemFromURL(url: string, options: {
		forceType?: BandcampItemType,
		fetchAdditionalData?: boolean,
		fetchAdditionalPages?: boolean } = {}): Promise<BandcampTrack | BandcampAlbum | BandcampArtist | BandcampFan> {
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
		const type = options.forceType ? options.forceType : this._parser.parseType(url, $);
		// parse data by type
		if(type === BandcampItemType.Fan) {
			// handle fan
			// check if this is actually the root fan page
			let fanURL = this._parser.parseMetaURL($);
			let fanURLType;
			if(fanURL) {
				fanURLType = this._parser.checkFanURLType(url, fanURL);
			} else {
				fanURL = url;
				fanURLType = '/';
			}
			let collectionSummary: PrivBandcampAPI$Fan$CollectionSummary | null = null;
			if(options.fetchAdditionalData ?? true) {
				// fetch fan collection summary
				collectionSummary = await this._fetchFanCollectionSummary(fanURL);
			}
			// parse fan
			const fan = this._parser.parseFanHtmlData(fanURL, data, collectionSummary);
			// fetch additional pages if needed
			if(options.fetchAdditionalPages ?? options.fetchAdditionalData ?? true) {
				// load and parse wishlist if this is the root fan page
				if(fanURLType == '/') {
					const wishlistURL = fanURL+'/wishlist';
					const { res: resWl, data: dataWl } = await this.sendHttpRequest(wishlistURL);
					if(dataWl) {
						const fan2 = this._parser.parseFanHtmlData(wishlistURL, dataWl, collectionSummary);
						if(fan2.wishlist) {
							fan.wishlist = fan2.wishlist;
						}
					} else {
						console.error(`Unable to get wishlist data from url (response was ${resWl.statusCode})`);
					}
				}
			}
			return fan;
		} else {
			// handle other item types
			const item = this._parser.parseItemFromURL(url, type, $);
			if(item == null) {
				if(res.statusCode >= 200 && res.statusCode < 300) {
					throw new Error(`Failed to parse '${type}' item`);
				} else {
					throw new Error(res.statusCode+": "+res.statusMessage);
				}
			}
			// if we're logged in and missing some audio streams,
			//  and if the link isn't a bandcamp subdomain
			//  then fetch the missing audio files from cdui
			if(options.fetchAdditionalData ?? true) {
				const itemAsTrack = item as BandcampTrack;
				const itemAsAlbum = item as BandcampAlbum;
				if(await this._session.getLoggedInStatus() && !isBandcampDomain
				&& (item.type === BandcampItemType.Track
					|| (item.type === BandcampItemType.Album && itemAsAlbum.tracks && itemAsAlbum.tracks.length > 0))) {
					let missingAudioSources = false;
					if((item.type === BandcampItemType.Track && (!itemAsTrack.audioSources || itemAsTrack.audioSources.length === 0))
					|| (item.type === BandcampItemType.Album && itemAsAlbum.tracks && itemAsAlbum.tracks.find((track) => (!track.audioSources || track.audioSources.length === 0)))) {
						missingAudioSources = true;
					}
					if(missingAudioSources) {
						const cdUIURL = this._parser.parseCDUILink($);
						const streams = cdUIURL ? (await this._fetchItemStreamsFromCDUI(cdUIURL, url)) : null;
						if(streams) {
							if(item.type === BandcampItemType.Track) {
								this._parser.attachStreamsToTracks([item], streams);
							} else if(item.type === BandcampItemType.Album && itemAsAlbum.tracks) {
								this._parser.attachStreamsToTracks(itemAsAlbum.tracks, streams);
							}
						}
					}
				}
			}
			return item;
		}
	}

	async _fetchCDUIData(cduiLink: string, refererURL: string) {
		const { res, data } = await this.sendHttpRequest(cduiLink, {
			headers: {
				'Pragma': 'no-cache',
				'Referer': refererURL,
				'Sec-Fetch-Dest': 'script',
				'Sec-Fetch-Mode': 'no-cors',
				'Sec-Fetch-Site': 'cross-site'
			}
		});
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(`${res.statusCode}: ${res.statusMessage}`);
		}
		if(!data) {
			throw new Error("Unable to get data from URL");
		}
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from URL");
		}
		if(dataString === 'oops') {
			throw new Error("request misformatted, got an oops");
		}
		return dataString;
	}

	async _fetchItemStreamsFromCDUI(cduiLink: string, refererURL: string) {
		const cduiData = await this._fetchCDUIData(cduiLink, refererURL);
		return this._parser.parseStreamFilesFromCDUI(cduiData);
	}

	async getTrack(trackURL: string, options: { fetchAdditionalData?: boolean, fetchAdditionalPages?: boolean } = {}): Promise<BandcampTrack> {
		return await this.getItemFromURL(trackURL, {
			forceType: BandcampItemType.Track,
			fetchAdditionalData: options.fetchAdditionalData ?? true,
			fetchAdditionalPages: options.fetchAdditionalPages ?? options.fetchAdditionalData ?? true
		}) as any as Promise<BandcampTrack>;
	}

	async getAlbum(albumURL: string, options: { fetchAdditionalData?: boolean, fetchAdditionalPages?: boolean } = {}): Promise<BandcampAlbum> {
		return await this.getItemFromURL(albumURL, {
			forceType: BandcampItemType.Album,
			fetchAdditionalData: options.fetchAdditionalData ?? true,
			fetchAdditionalPages: options.fetchAdditionalPages ?? options.fetchAdditionalData ?? true
		}) as any as Promise<BandcampAlbum>;
	}

	async getArtist(artistURL: string, options: { fetchAdditionalData?: boolean, fetchAdditionalPages?: boolean } = {}): Promise<BandcampArtist> {
		return await this.getItemFromURL(UrlUtils.resolve(artistURL,'/music'), {
			forceType: BandcampItemType.Artist,
			fetchAdditionalData: options.fetchAdditionalData ?? true,
			fetchAdditionalPages: options.fetchAdditionalPages ?? options.fetchAdditionalData ?? true
		}) as any as Promise<BandcampArtist>;
	}

	async _fetchFanCollectionSummary(fanURL: string): Promise<PrivBandcampAPI$Fan$CollectionSummary | null> {
		const collectionSummaryURL = 'https://bandcamp.com/api/fan/2/collection_summary';
		const { res: resCs, data: dataCs } = await this.sendHttpRequest(collectionSummaryURL, {
			headers: {
				'Referer': fanURL,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
			}
		});
		const collectionSummary = dataCs ? JSON.parse(dataCs.toString()) : dataCs;
		return collectionSummary;
	}

	async getFan(fanURL: string, options: { fetchAdditionalData?: boolean, fetchAdditionalPages?: boolean } = {}): Promise<BandcampFan> {
		return await this.getItemFromURL(fanURL, {
			forceType: BandcampItemType.Fan,
			fetchAdditionalData: options.fetchAdditionalData ?? true,
			fetchAdditionalPages: options.fetchAdditionalPages ?? options.fetchAdditionalData ?? true
		}) as any as Promise<BandcampFan>;
	}

	async getMyIdentities(): Promise<BandcampIdentities> {
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



	async _getFanSectionItems<T>(
		apiURL: string,
		referrer: string,
		fanURL: string,
		fanId: string | number,
		{ olderThanToken, count }: {
			olderThanToken?: string | null,
			count?: number
		},
		resultParser: (res: HttpResponse, data: Buffer) => T): Promise<T> {
		if(!fanURL) {
			throw new Error("missing required fanURL for _getFanSectionItems");
		} else if(fanId == null) {
			throw new Error("missing required fanId for _getFanSectionItems");
		}
		// check if we have any cookies
		let cookies: tough.Cookie[];
		try {
			cookies = await this._session.getBandcampCookies();
		} catch(error) {
			console.error(error);
			cookies = [];
		}
		if(cookies.length == 0) {
			// go to fan page first to acquire cookies
			await this.getFan(fanURL, {
				fetchAdditionalData: false
			});
		}

		// make sure fanId is an integer
		fanId = this._parser.convertToNumberIfAble(fanId);
		// build body
		const body: {
			fan_id: string | number
			older_than_token: string | null
			count: number
		} = {
			fan_id: fanId,
			older_than_token: olderThanToken ?? `${Math.floor((new Date()).getTime()/1000)+3600}::t::`,
			count: count ?? 20
		};
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

	async getFanCollectionItems(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$CollectionPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/collection_items',
			fanURL, fanURL, fanId, { olderThanToken, count },
			(res, data): BandcampFan$CollectionPage => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanWishlistItems(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$WishlistPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/wishlist_items',
			fanURL+'/wishlist', fanURL, fanId, { olderThanToken, count },
			(res, data): BandcampFan$WishlistPage => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanHiddenItems(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$CollectionPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/hidden_items',
			fanURL, fanURL, fanId, { olderThanToken, count },
			(res, data): BandcampFan$CollectionPage => {
				return this._parser.parseFanCollectionItemsJsonData(res,data);
			});
	}

	async getFanFollowingArtists(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$FollowedArtistPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/following_bands',
			fanURL+'/following/artists_and_labels', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionArtistsJsonData(res,data);
			});
	}

	async getFanFollowingFans(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$FollowedFanPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/following_fans',
			fanURL+'/following/fans', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionFansJsonData(res,data);
			});
	}

	async getFanFollowers(fanURL: string, fanId: string | number, {olderThanToken, count}: { olderThanToken?: string | null, count?: number }): Promise<BandcampFan$FollowedFanPage> {
		return await this._getFanSectionItems(
			'https://bandcamp.com/api/fancollection/1/followers',
			fanURL+'/followers', fanURL, fanId, { olderThanToken, count },
			(res, data) => {
				return this._parser.parseFanCollectionFansJsonData(res,data);
			});
	}



	async _searchFanSectionItems<T>(
		query: string,
		options: {
			searchType: string,
			referer: string,
			fanURL: string,
			fanId: string | number
		},
		resultParser: (res: HttpResponse, data: Buffer) => T): Promise<T> {
		if(!options.fanURL) {
			throw new Error("missing required fanURL for _searchFanSectionItems");
		} else if(options.fanId == null) {
			throw new Error("missing required fanId for _searchFanSectionItems");
		}
		// check if we have any cookies
		let cookies: tough.Cookie[];
		try {
			cookies = await this._session.getBandcampCookies();
		} catch(error) {
			console.error(error);
			cookies = [];
		}
		if(cookies.length == 0) {
			// go to fan page first to acquire cookies
			await this.getFan(options.fanURL, {
				fetchAdditionalData: false
			});
		}
		
		// make sure fanId is an integer
		const fanId = this._parser.convertToNumberIfAble(options.fanId);
		// build body
		const body: {
			fan_id: string | number
			search_key: string | null
			search_type: string
		} = {
			fan_id: fanId,
			search_key: query,
			search_type: options.searchType
		};
		const jsonBody = JSON.stringify(body);
		const { res, data } = await this.sendHttpRequest("https://bandcamp.com/api/fancollection/1/search_items", {
			method: 'POST',
			body: jsonBody,
			headers: {
				'Content-Length': jsonBody.length,
				'Origin': 'https://bandcamp.com',
				'Referer': options.referer,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			}
		});
		return resultParser(res, data);
	}

	async searchFanCollectionItems(query: string, fanURL: string, fanId: string | number): Promise<BandcampFan$SearchMediaItemsPage> {
		return await this._searchFanSectionItems(query, {
				searchType: 'collection',
				referer: fanURL,
				fanURL: fanURL,
				fanId: fanId
			},
			(res, data) => {
				return this._parser.parseFanSearchMediaItemsJsonData(res,data);
			});
	}

	async searchFanWishlistItems(query: string, fanURL: string, fanId: string | number): Promise<BandcampFan$SearchMediaItemsPage> {
		return await this._searchFanSectionItems(query, {
				searchType: 'wishlist',
				referer: fanURL+'/wishlist',
				fanURL: fanURL,
				fanId: fanId
			},
			(res, data) => {
				return this._parser.parseFanSearchMediaItemsJsonData(res,data);
			});
	}



	async _performArtistFollowAction(artistURL: string, action: ('follow' | 'unfollow')) {
		if(!await this._session.getLoggedInStatus()) {
			throw new Error("not logged in");
		}
		artistURL = this._parser.cleanUpURL(artistURL);
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			throw new Error("Could not parse current fan info");
		}
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
		const artist = this._parser.parseItemFromURL(artistURL, BandcampItemType.Artist, $);
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
		const reqBodyObj: {
			fan_id: string
			band_id: string
			action: 'follow' | 'unfollow'
			ref_token?: string
		} = {
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
		const headers: {[key: string]: string | number} = {
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
		dataString = data ? data.toString() : "";
		const result = dataString ? JSON.parse(dataString) : null;
		this._parser.parseFollowActionError(res, result, action);
		return result;
	}

	async followArtist(artistURL: string): Promise<void> {
		return await this._performArtistFollowAction(artistURL, 'follow');
	}

	async unfollowArtist(artistURL: string): Promise<void> {
		return await this._performArtistFollowAction(artistURL, 'unfollow');
	}



	async _performFanFollowAction(fanURL: string, action: ('follow' | 'unfollow')) {
		if(!await this._session.getLoggedInStatus()) {
			throw new Error("not logged in");
		}
		fanURL = this._parser.cleanUpURL(fanURL);
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			throw new Error("Could not parse current fan info");
		}
		// get data from fan url
		const { targetFanId, crumbs } = await (async () => {
			const { res, data } = await this.sendHttpRequest(fanURL);
			const dataString = data ? data.toString() : null;
			if(!dataString) {
				throw new Error("Unable to get data from fan url");
			}
			// parse response
			const $ = cheerio.load(dataString);
			const pageData = this._parser.parsePageData($);
			if(!pageData) {
				throw new Error("Could not parse page data to get fan_data");
			}
			return {
				targetFanId: pageData.fan_data.fan_id,
				crumbs: this._parser.parseCrumbs($)
			};
		})();
		// ensure current fan ID
		if(!fanInfo.id) {
			throw new Error("could not parse current fan id");
		}
		// ensure target fan ID
		if(!targetFanId) {
			throw new Error("could not parse target fan id");
		}
		// ensure crumbs
		if(!crumbs) {
			throw new Error("could not parse crumbs");
		}
		// create post request
		const reqBodyObj = {
			fan_id: fanInfo.id,
			follow_id: targetFanId,
			action: action,
			crumb: crumbs.fan_follow_cb
		};
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const { res, data } = await this.sendHttpRequest('https://bandcamp.com/fan_follow_cb', {
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
		// parse response
		const dataString = data ? data.toString() : null;
		const result = dataString ? JSON.parse(dataString) : null;
		this._parser.parseFollowActionError(res, result, action);
		return result;
	}

	async followFan(fanURL: string): Promise<void> {
		return await this._performFanFollowAction(fanURL, 'follow');
	}

	async unfollowFan(fanURL: string): Promise<void> {
		return await this._performFanFollowAction(fanURL, 'unfollow');
	}



	async _performWishlistItemAction(itemURL: string, action: ('collect' | 'uncollect')) {
		if(!await this._session.getLoggedInStatus()) {
			throw new Error("not logged in");
		}
		itemURL = this._parser.cleanUpURL(itemURL);
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			throw new Error("Could not parse current fan info");
		}
		const callbackName = `${action}_item_cb`;
		const isBandcampDomain = this._parser.isUrlBandcampDomain(itemURL);
		// perform request to get item
		const { item, refToken, crumbs } = await (async () => {
			// get data from item URL
			const { res, data } = await this.sendHttpRequest(itemURL);
			const dataString = data ? data.toString() : null;
			if(!dataString) {
				throw new Error("Could not get item data");
			}
			// parse item data
			const $ = cheerio.load(dataString);
			const item = this._parser.parseItemFromURL(itemURL, this._parser.parseType(itemURL), $);
			if(item == null) {
				if(res.statusCode >= 200 && res.statusCode < 300) {
					throw new Error("Failed to parse item");
				} else {
					throw new Error(res.statusCode+": "+res.statusMessage);
				}
			}
			// parse ref token
			const refToken = this._parser.parseReferrerToken($);
			// parse crumbs
			const crumbs = this._parser.parseCrumbs($);
			return { item, refToken, crumbs };
		})();
		const mediaItem = (item as BandcampTrack | BandcampAlbum);
		// ensure artist
		if(!mediaItem.artist) {
			throw new Error("artist property is missing on item");
		}
		const bandId = mediaItem.artist.id;
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
		const reqBodyObj: {
			fan_id: string
			band_id: string
			item_id: string
			item_type: string
			ref_token?: string
			crumb?: string
		} = {
			fan_id: fanInfo.id,
			band_id: bandId,
			item_id: item.id,
			item_type: item.type
		};
		// parse ref_token
		if(action === 'collect') {
			if(!refToken) {
				throw new Error("couldn't parse ref token");
			}
			reqBodyObj.ref_token = refToken;
		}
		// parse crumb
		if(isBandcampDomain) {
			if(crumbs && crumbs[callbackName]) {
				reqBodyObj.crumb = crumbs[callbackName];
			}
		}
		// send post request
		const reqBody = QueryString.stringify(reqBodyObj);
		const headers: {[key: string]: string | number} = {
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
			apiURL = UrlUtils.resolve(itemURL, `/${callbackName}`);
			headers['Sec-Fetch-Site'] = 'same-origin';
		} else {
			apiURL = `https://bandcamp.com/${callbackName}`;
			headers['Sec-Fetch-Site'] = 'cross-site';
		}
		const { res, data } = await this.sendHttpRequest(apiURL, {
			method: 'POST',
			headers: headers,
			body: reqBody
		});
		// parse response
		const dataString = data ? data.toString() : null;
		const result = dataString ? JSON.parse(dataString) : null;
		this._parser.parseFollowActionError(res, result, action);
		return result;
	}

	async wishlistItem(itemURL: string): Promise<void> {
		return await this._performWishlistItemAction(itemURL, 'collect');
	}

	async unwishlistItem(itemURL: string): Promise<void> {
		return await this._performWishlistItemAction(itemURL, 'uncollect');
	}



	async _performCollectionHideAction(itemURL: string, action: ('hide' | 'unhide')) {
		if(!await this._session.getLoggedInStatus()) {
			throw new Error("not logged in");
		}
		const apiEndpoint = 'api/collectionowner/1/hide_unhide_item';
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			throw new Error("Could not parse current fan info");
		}
		// ensure fan URL is set
		if(!fanInfo.url) {
			throw new Error("Could not parse fan URL");
		}
		// perform both requests simultaneously
		const [ crumbs, item ] = await Promise.all([
			// fan-page request
			this._getCurrentFanPageCrumbs(),
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
				const item = this._parser.parseItemFromURL(itemURL, this._parser.parseType(itemURL), $);
				if(item == null) {
					if(res.statusCode >= 200 && res.statusCode < 300) {
						throw new Error("Failed to parse item");
					} else {
						throw new Error(res.statusCode+": "+res.statusMessage);
					}
				}
				return item;
			})()
		]);
		// ensure crumbs are set
		if(!crumbs || !crumbs[apiEndpoint]) {
			throw new Error("Could not parse crumb data");
		}
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
			crumb: crumbs[apiEndpoint]
		});
		const { res, data } = await this.sendHttpRequest(`https://bandcamp.com/${apiEndpoint}`, {
			method: 'POST',
			headers: {
				'Content-Length': reqBody.length,
				'Origin': 'https://bandcamp.com',
				'Referer': `${fanInfo.url}/`,
				'Sec-Fetch-Dest': 'empty',
				'Sec-Fetch-Mode': 'cors',
				'Sec-Fetch-Site': 'same-origin',
				'X-Requested-With': 'XMLHttpRequest'
			},
			body: reqBody
		});
		// parse response
		const dataString = data ? data.toString() : null;
		const result = dataString ? JSON.parse(dataString) : null;
		this._parser.parseFollowActionError(res, result, action);
		return result;
	}

	async hideCollectionItem(itemURL: string): Promise<void> {
		return await this._performCollectionHideAction(itemURL, 'hide');
	}

	async unhideCollectionItem(itemURL: string): Promise<void> {
		return await this._performCollectionHideAction(itemURL, 'unhide');
	}



	async _performSaveItemAction(itemURL: string, action: ('save' | 'unsave')) {
		if(!await this._session.getLoggedInStatus()) {
			throw new Error("not logged in");
		}
		const fanInfo = await this._getCurrentFanInfo();
		if(!fanInfo) {
			throw new Error("Could not parse current fan info");
		}
		const isBandcampDomain = this._parser.isUrlBandcampDomain(itemURL);
		// fetch data
		const [ fanCrumbs, { item, itemCrumbs, isPurchased, refToken } ] = await Promise.all([
			this._getCurrentFanPageCrumbs(),
			(async () => {
				// get data from item URL
				const { res, data } = await this.sendHttpRequest(itemURL);
				const dataString = data ? data.toString() : null;
				if(!dataString) {
					throw new Error("Could not get item data");
				}
				// parse item data
				const $ = cheerio.load(dataString);
				const item = this._parser.parseItemFromURL(itemURL, this._parser.parseType(itemURL), $);
				if(item == null) {
					if(res.statusCode >= 200 && res.statusCode < 300) {
						throw new Error("Failed to parse item");
					} else {
						throw new Error(res.statusCode+": "+res.statusMessage);
					}
				}
				// get purchase status
				let isPurchased = null;
				let isWishlisted = null;
				if(isBandcampDomain) {
					const pageData = this._parser.parsePageData($);
					const trAlbumData = pageData.fan_tralbum_data;
					isPurchased = trAlbumData.is_purchased;
					isWishlisted = trAlbumData.is_wishlisted;
				} else {
					// parse extra CDUI data since not bandcamp domain
					const cduiLink = this._parser.parseCDUILink($);
					const cduiData = cduiLink ? (await this._fetchCDUIData(cduiLink, itemURL)) : null;
					const fanControls = cduiData ? this._parser.parseFanControlsFromCDUI(cduiData) : {};
					isPurchased = fanControls.is_purchased;
					isWishlisted = fanControls.is_collected;
				}
				return {
					item,
					itemCrumbs: this._parser.parseCrumbs($),
					isPurchased,
					isWishlisted,
					refToken: this._parser.parseReferrerToken($)
				};
			})()
		]);
		// ensure required variables
		if(!fanInfo.id) {
			throw new Error("Unable to parse fan ID");
		}
		if(!item.id) {
			throw new Error("Unable to parse item ID");
		}
		if(!item.type) {
			throw new Error("Unable to parse item type");
		}
		// perform request depending on purchase state
		if(isPurchased) {
			// hiding / unhiding collection items
			let hideAction: 'hide' | 'unhide';
			if(action === 'save') {
				hideAction = 'unhide';
			}
			else if(action === 'unsave') {
				hideAction = 'hide';
			}
			else {
				throw new Error("Invalid action "+action);
			}
			const apiEndpoint = 'api/collectionowner/1/hide_unhide_item';
			// ensure crumb
			if(!fanCrumbs || !fanCrumbs[apiEndpoint]) {
				throw new Error("unable to parse crumb");
			}
			// send post request
			const reqBody = JSON.stringify({
				fan_id: this._parser.convertToNumberIfAble(fanInfo.id),
				item_type: item.type,
				item_id: this._parser.convertToNumberIfAble(item.id),
				action: hideAction,
				//collection_index: (action === 'unhide') ? 0 : null // TODO determine if we actually need this parameter
				crumb: fanCrumbs[apiEndpoint]
			});
			const { res, data } = await this.sendHttpRequest(`https://bandcamp.com/${apiEndpoint}`, {
				method: 'POST',
				headers: {
					'Content-Length': reqBody.length,
					'Origin': 'https://bandcamp.com',
					'Referer': `${fanInfo.url}/`,
					'Sec-Fetch-Dest': 'empty',
					'Sec-Fetch-Mode': 'cors',
					'Sec-Fetch-Site': 'same-origin',
					'X-Requested-With': 'XMLHttpRequest'
				},
				body: reqBody
			});
			// parse response
			const dataString = data ? data.toString() : null;
			const result = dataString ? JSON.parse(dataString) : null;
			this._parser.parseFollowActionError(res, result, hideAction);
			return result;
		}
		else {
			// wishlisting / unwishlisting items
			let collectAction: 'collect' | 'uncollect';
			if(action === 'save') {
				collectAction = 'collect';
			}
			else if(action === 'unsave') {
				collectAction = 'uncollect';
			}
			else {
				throw new Error("Invalid action "+action);
			}
			const callbackName = `${collectAction}_item_cb`;
			const mediaItem = item as (BandcampTrack | BandcampAlbum);
			// ensure band id
			if(!mediaItem.artist || !mediaItem.artist.id) {
				throw new Error("failed to parse item artist ID");
			}
			// create post body object
			const reqBodyObj: {
				fan_id: string,
				band_id: string
				item_id: string
				item_type: string
				ref_token?: string
				crumb?: string
			} = {
				fan_id: fanInfo.id,
				band_id: mediaItem.artist.id,
				item_id: item.id,
				item_type: item.type
			};
			if(collectAction === 'collect') {
				reqBodyObj.ref_token = refToken;
			}
			// parse crumb
			if(isBandcampDomain) {
				if(itemCrumbs && itemCrumbs[callbackName]) {
					reqBodyObj.crumb = itemCrumbs[callbackName];
				} else {
					throw new Error("unable to parse crumb");
				}
			}
			// send post request
			const reqBody = QueryString.stringify(reqBodyObj);
			const headers: {[key: string]: string | number} = {
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
				apiURL = UrlUtils.resolve(itemURL, `/${callbackName}`);
				headers['Sec-Fetch-Site'] = 'same-origin';
			} else {
				apiURL = `https://bandcamp.com/${callbackName}`;
				headers['Sec-Fetch-Site'] = 'cross-site';
			}
			const { res, data } = await this.sendHttpRequest(apiURL, {
				method: 'POST',
				headers: headers,
				body: reqBody
			});
			// parse response
			const dataString = data ? data.toString() : null;
			const result = dataString ? JSON.parse(dataString) : null;
			this._parser.parseFollowActionError(res, result, collectAction);
			return result;
		}
	}

	async saveItem(itemURL: string): Promise<void> {
		return await this._performSaveItemAction(itemURL, 'save');
	}

	async unsaveItem(itemURL: string): Promise<void> {
		return await this._performSaveItemAction(itemURL, 'unsave');
	}



	async downloadTrackAudioSource(track: (BandcampTrack | BandcampAlbumTrack), audioSource: BandcampAudioSource, options: {
		verbose?: boolean,
		logger?: (message: any) => void
		dir: string,
		output?: string,
		outputIsFormatString?: boolean,
		createOutputPath?: boolean
	}): Promise<string> {
		// resolve output path
		let output = options.output;
		let outputIsFormatString = options.outputIsFormatString ?? true;
		if(output == null) {
			output = DefaultOutputStructure;
			outputIsFormatString = true;
		}
		if(outputIsFormatString) {
			output = formatTrackAudioFileOutputPath(output, track, audioSource);
		}
		// create output path
		const filepath = path.resolve(options.dir, output);
		if(options.createOutputPath) {
			await createPathForFile(options.dir, filepath, {
				verbose: options.verbose,
				logger: options.logger
			});
		}
		// download the file
		if (options.logger) {
			options.logger(`Downloading ${audioSource.type} audio for track ${track.url} to path ${filepath}`);
		}
		await this.downloadFile(audioSource.url, filepath);
		if (options.logger) {
			options.logger(`Done downloading to ${filepath}`);
		}
		return filepath;
	}
}
