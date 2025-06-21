
import {
	HttpResponse
} from './network_utils';
import UrlUtils, {
	URL
} from 'url';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import {
	BandcampItemType,
	BandcampItemTypes,
	BandcampAlbum,
	BandcampAlbumTrack,
	BandcampArtist,
	BandcampAudioSource,
	BandcampImage,
	BandcampSearchResult,
	BandcampSearchResultsList,
	BandcampTrack,
	BandcampArtistShow,
	BandcampLink,
	BandcampArtistPageItem,
	BandcampIdentities,
	BandcampFan,
	BandcampFan$PageSection,
	BandcampFan$CollectionSection,
	BandcampFan$ArtistSection,
	BandcampFan$CollectionTrack,
	BandcampFan$CollectionAlbum,
	BandcampFan$CollectionArtist,
	BandcampFan$CollectionNode,
	BandcampFan$FollowedArtistNode,
	BandcampFan$FanSection,
	BandcampFan$FollowedFanNode,
	BandcampFan$CollectionFan,
	BandcampFan$CollectionPage,
	BandcampFan$FollowedArtistPage,
	BandcampFan$FollowedFanPage,
	BandcampFan$SearchMediaItemsPage,
	BandcampImageSize,
	BandcampFanFeedPage,
	BandcampFanFeed$Story,
	BandcampFanFeed$StoryType,
	BandcampFanFeed$Fan,
	BandcampFanFeed$Album,
	BandcampItemTypeChar,
	BandcampFanFeed$Track
} from './types';
import {
	PrivBandcampTRAlbumData,
	PrivBandcampTRAlbumDataTrack,
	PrivBandcampTrackLDJson,
	PrivBandcampAlbumLDJson,
	PrivBandcampFan$AlbumTrack,
	PrivBandcampFan$CollectionBatchData,
	PrivBandcampFan$CollectionItemInfo,
	PrivBandcampFan$FanData,
	PrivBandcampFan$PageData,
	PrivBandcampAPI$Fan$CollectionSummary,
	PrivBandcampAPI$Fan$CollectionSummary$TRAlbumLookup,
	PrivBandcampAlbumLDJsonTrack,
	PrivBandcampAPI$Fan$CollectionItemsResult,
	PrivBandcampAPI$Fan$FollowingArtistsResult,
	PrivBandcampAPI$Fan$FanFollowItemsResult,
	PrivBandcampAPI$Fan$CollectionMediaItem,
	PrivBandcampAPI$Fan$SearchItemsResult,
	PrivBandcampIdentities,
	PrivBandcampFanFeedPage,
	PrivBandcampFanFeed$Story,
	PrivBandcampFanFeed$Fan,
	PrivBandcampFanFeed$Track,
	PrivBandcampAPI$FanDashFeedUpdates,
	PrivBandcampMediaLDJsonType
} from './types/private';



export class BandcampParser {
	parseResponseHeaders(res: HttpResponse): {[key: string]: (string | string[])} {
		const headers: {[key: string]: (string | string[])} = {};
		const rawHeaders = res.rawHeaders;
		for(let i=0; i<rawHeaders.length; i++) {
			const headerName = rawHeaders[i];
			i++;
			let headerValue: string | string[] = rawHeaders[i];
			const existingHeaderValue = headers[headerName];
			if(existingHeaderValue) {
				if(existingHeaderValue instanceof Array) {
					headerValue = existingHeaderValue.concat([ headerValue ]);
				} else {
					headerValue = [ existingHeaderValue, headerValue ]
				}
			}
			headers[headerName] = headerValue;
		}
		return headers;
	}



	isUrlBandcampDomain(url: string): boolean {
		const urlParts = UrlUtils.parse(url);
		if(urlParts.hostname === 'bandcamp.com' || urlParts.hostname?.endsWith('.bandcamp.com')) {
			return true;
		}
		return false;
	}



	slugify(str: string): string {
		let charMap: {[key: string]: string} = {
			"'": '',
			'"': '',
			'(': '',
			')': ''
		};
		let output = str.split('')
			// replace special characters
			.reduce((result, ch) => {
				const repCh = charMap[ch];
				if(repCh != null) {
					return result + repCh;
				}
				return result + ch.replace(/([^\w\s$*_+~.'"!:@]|(\.|\+|\*|~|\\|\/))/g, '-');
			}, '')
			.toLowerCase()
			// trim leading/trailing spaces
			.trim()
			// convert spaces
			.replace(/[-\s]+/g, '-')
			// remove consecutive dashes;
			.replace(/--+/, '-');
		// remove ending dashes
		while(output.length > 1 && output.endsWith('-')) {
			output = output.slice(0, output.length-1);
		}
		// remove beginning dashes
		while(output.length > 1 && output.startsWith('-')) {
			output = output.slice(1, output.length-1);
		}
		return output;
	}



	parseType(url: string, $: cheerio.CheerioAPI | null = null): BandcampItemType {
		// parse type from URL
		const urlObj = new URL(url);
		if(urlObj.host != 'bandcamp.com' && (!urlObj.pathname || urlObj.pathname === '/' || urlObj.pathname === '')) {
			return BandcampItemType.Artist;
		}
		// parse from pathname
		if(urlObj.pathname) {
			if(urlObj.pathname === '/music' || urlObj.pathname === '/releases') {
				return BandcampItemType.Artist;
			}
			if(urlObj.pathname === '/artists') {
				return BandcampItemType.Label;
			}
			else if(urlObj.pathname.startsWith('/album/') && urlObj.pathname.length > '/album/'.length) {
				return BandcampItemType.Album;
			}
			else if(urlObj.pathname.startsWith('/track/') && urlObj.pathname.length > '/track/'.length) {
				return BandcampItemType.Track;
			}
		}
		// parse type from page
		if($) {
			const metaType = $('meta[property="og:type"]').attr('content');
			if(metaType) {
				if(metaType === 'band') {
					return BandcampItemType.Artist;
				}
				else if(metaType === 'song') {
					return BandcampItemType.Track;
				}
				else if(metaType == 'profile') {
					return BandcampItemType.Fan;
				}
				else if(BandcampItemTypes.indexOf(metaType as any) !== -1) {
					return metaType as BandcampItemType;
				}
			}
		}
		if(url) {
			throw new Error(`Failed to parse item type for '${url}'`);
		}
		throw new Error("failed to parse item type");
	}

	parseMetaURL($: cheerio.CheerioAPI): (string | undefined) {
		const metaURL = $('meta[property="og:url"]').attr('content');
		if(metaURL && metaURL.length == 0) {
			return undefined;
		}
		return metaURL;
	}

	checkFanURLType(url: string, fanURL: string): ('/' | 'wishlist' | string) {
		if(url.startsWith(fanURL)) {
			let trailingOffset = fanURL.length;
			let minDiff = 1;
			if(!fanURL.endsWith('/')) {
				minDiff++;
				trailingOffset++;
			}
			if((fanURL.length - url.length) >= minDiff) {
				let trailing = url.substring(trailingOffset);
				while(trailing.startsWith('/')) {
					trailing = trailing.substring(1);
				}
				if(!trailing.startsWith('?') && !trailing.startsWith('#') && trailing.length > 0) {
					if(trailing == 'wishlist' || trailing.startsWith('wishlist/')) {
						return 'wishlist';
					}
					const hashIndex = trailing.indexOf('#');
					if(hashIndex != -1) {
						trailing = trailing.substring(0, hashIndex);
					}
					const queryIndex = trailing.indexOf('?');
					if(queryIndex != -1) {
						trailing = trailing.substring(0, queryIndex);
					}
					return trailing;
				}
			}
		}
		return '/';
	}



	cleanUpURL(url: string): string {
		const urlParts = UrlUtils.parse(url);
		if(urlParts.hash) {
			urlParts.hash = "";
		}
		let cleanedURL = UrlUtils.format(urlParts);
		while(cleanedURL.endsWith('/')) {
			cleanedURL = cleanedURL.substring(0, cleanedURL.length-1);
		}
		return cleanedURL;
	}


	padImageId(imageId: number | string): string {
		imageId = ''+imageId;
		while(imageId.length < 10) {
			imageId = '0'+imageId;
		}
		return imageId;
	}

	createImagesFromImageId(imageId: string): BandcampImage[] {
		const baseURL = 'https://f4.bcbits.com/img';
		return [
			{
				url: `${baseURL}/${imageId}_10.jpg`,
				size: BandcampImageSize.Large,
			},
			{
				url: `${baseURL}/${imageId}_16.jpg`,
				size: BandcampImageSize.Large,
			},
			{
				url: `${baseURL}/${imageId}_9.jpg`,
				size: BandcampImageSize.Medium,
			},
			{
				url: `${baseURL}/${imageId}_6.jpg`,
				size: BandcampImageSize.Small,
			}
		];
	}

	artistURLHintsToURL(url_hints: any): string | undefined {
		let url = undefined;
		if(url_hints) {
			if(url_hints.custom_domain) {
				url = this.cleanUpURL(`https://${url_hints.custom_domain}`);
			} else if(url_hints.subdomain) {
				url = this.cleanUpURL(`https://${url_hints.subdomain}.bandcamp.com`);
			}
		}
		if(url) {
			url = this.cleanUpURL(url);
		}
		return url;
	}

	itemURLHintsToURL(url_hints: any): string | undefined {
		let url = this.artistURLHintsToURL(url_hints);
		if(!url) {
			return url;
		}
		if(url_hints.item_type === 't' && url_hints.slug) {
			return this.cleanUpURL(UrlUtils.resolve(url, `/track/${url_hints.slug}`));
		}
		else if(url_hints.item_type === 'a' && url_hints.slug) {
			return this.cleanUpURL(UrlUtils.resolve(url, `/album/${url_hints.slug}`));
		}
		return undefined;
	}


	convertToNumberIfAble(val: string | number): string | number {
		if(typeof val === 'string') {
			let allDigits = true;
			const digits = ['0','1','2','3','4','5','6','7','8','9'];
			for(let i=0; i<val.length; i++) {
				if(digits.indexOf(val[i]) === -1) {
					allDigits = false;
					break;
				}
			}
			if(allDigits) {
				val = Number.parseInt(val);
			}
		}
		return val;
	}


	formatDate(dateString: string): string {
		if(typeof dateString === 'string') {
			const date = new Date(dateString);
			if(date instanceof Date && !Number.isNaN(date.getTime())) {
				return date.toISOString();
			}
		}
		return dateString;
	}



	parseSearchResultsData(url: string, data: Buffer): BandcampSearchResultsList {
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		return this.parseSearchResults(url, $);
	}
	parseSearchResults(url: string, $: cheerio.CheerioAPI): BandcampSearchResultsList {
		const resultItems = $('ul.result-items > li');
		let items: BandcampSearchResult[] = [];
		// parse each result item
		resultItems.each((index, resultItem) => {
			let resultItemHtml = $(resultItem);

			// find subheading lines
			const subheads: string[] = resultItemHtml.find('.subhead').text().split('\n').map((text) => {
				text = text.trim();
				if(!text) {
					return undefined;
				}
				return text;
			}).filter((text) => (text !== undefined)) as string[];

			// get item type
			let type = resultItemHtml.find('.itemtype').text().trim().toLowerCase();
			if(type === 'song') {
				type = BandcampItemType.Track;
			}
			else if(type === 'band') {
				type = BandcampItemType.Artist;
			}
			if(BandcampItemTypes.indexOf(type as any) === -1) {
				console.error(`Unrecognized item type ${type} from url ${url}`);
			}

			// parse release date
			let releaseDate: string | undefined = resultItemHtml.find('.released').text().trim().replace(/^released /, '').trim();
			if(releaseDate) {
				releaseDate = this.formatDate(releaseDate);
			} else {
				releaseDate = undefined;
			}

			// parse general fields
			const item: BandcampSearchResult = {
				type: type as BandcampItemType,
				name: resultItemHtml.find('.heading').text().trim(),
				url: this.cleanUpURL(resultItemHtml.find('.itemurl').text().trim()),
				imageURL: resultItemHtml.find('.art img').attr('src') || undefined,
				tags: (() => {
					let tags = resultItemHtml.find('.tags').text().trim().replace(/^tags:/, '').trim().replace(/\s/g, '');
					return (tags.length > 1) ? tags.split(',') : [];
				})(),
				genre: resultItemHtml.find('.genre').text().trim().replace(/^genre:/, '').trim().replace(/\s{2,}/g, ' ') || undefined,
				releaseDate: releaseDate
			};

			// parse type-specific fields
			if(item.type === BandcampItemType.Track || item.type === BandcampItemType.Album) {
				let artistName = subheads.find((subhead) => {
					return subhead.startsWith('by ');
				});
				if(artistName) {
					artistName = artistName.substring('by '.length).trim();
					item.artistName = artistName;
					item.artistURL = this.cleanUpURL(UrlUtils.resolve(item.url, '/'));
				}
			}
			if(item.type === BandcampItemType.Track) {
				let albumName = subheads.find((subhead) => {
					return subhead.startsWith('from ');
				});
				if(albumName) {
					albumName = albumName.substring('from '.length).trim();
					item.albumName = albumName;
					if(item.artistURL) {
						// TODO we shouldn't be slugifying the album name to get the URL.
						// This is a hacky fix, but we have no real way of getting the true album URL from this data
						item.albumURL = this.cleanUpURL(UrlUtils.resolve(item.artistURL, '/album/'+this.slugify(albumName)));
					}
				}
				else {
					// if no album name is present, track is a single
					item.albumName = item.name;
					item.albumURL = item.url;
				}
			}
			else if(item.type === BandcampItemType.Artist) {
				item.location = (subheads.length > 0) ? subheads[0] : undefined;
			}
			else if(item.type === BandcampItemType.Album) {
				let artistName = subheads.find((subhead) => {
					return subhead.startsWith('by ');
				});
				if(artistName) {
					artistName = artistName.substring('by '.length).trim();
					item.artistName = artistName;
					item.artistURL = this.cleanUpURL(UrlUtils.resolve(item.url, '/'));
				}
				item.numTracks = (() => {
					let info = resultItemHtml.find('.length').text().trim().split(',');
					if(info.length !== 2) {
						return undefined;
					}
					return parseInt(info[0].replace(/ tracks$/, ''));
				})();
				item.numMinutes = (() => {
					let info = resultItemHtml.find('.length').text().trim().split(',');
					if(info.length !== 2) {
						return undefined;
					}
					return parseInt(info[1].replace(/ minutes$/, ''));
				})();
			}

			// delete undefined keys
			const deleteKeys = [];
			for(const key in item) {
				if((item as any)[key] === undefined) {
					deleteKeys.push(key);
				}
			}
			for(const key of deleteKeys) {
				delete (item as any)[key];
			}

			items.push(item);
		});
		const prevURL = $('.pager_controls a.prev').attr('href');
		const nextURL = $('.pager_controls a.next').attr('href');
		return {
			items,
			prevURL: prevURL ? UrlUtils.resolve(url, prevURL) : null,
			nextURL: nextURL ? UrlUtils.resolve(url, nextURL) : null
		};
	}



	parseTrackInfo(url: string, $: cheerio.CheerioAPI): BandcampAlbum | BandcampTrack | null {
		const trackInfo = $('#trackInfo');
		if(trackInfo.index() === -1) {
			return null;
		}

		// find common elements
		const nameSection = $('#name-section');
		const trackTable = $('#track_table');
		const trAlbumCredits = $('.tralbum-credits');
		const trAlbumCreditsLines = trAlbumCredits.text().split('\n').map((text) => {
			text = text.trim();
			if(!text) {
				return undefined;
			}
			return text;
		}).filter((text) => (text !== undefined));

		// get LD JSON
		let ldJson: (PrivBandcampTrackLDJson | PrivBandcampAlbumLDJson | null) = null;
		const ldJsonTag = $('script[type="application/ld+json"]');
		if(ldJsonTag != null && ldJsonTag.index() !== -1) {
			const ldJsonStr = ldJsonTag.html()?.trim();
			try {
				ldJson = (ldJsonStr != null) ? JSON.parse(ldJsonStr) : null;
			} catch(error) {
				ldJson = null;
			}
		}

		// get data-tralbum
		let trAlbumData: (PrivBandcampTRAlbumData | null) = null;
		const trAlbumDataText = $('script[data-tralbum]').attr('data-tralbum');
		if(trAlbumDataText) {
			try {
				trAlbumData = JSON.parse(trAlbumDataText);
			} catch(error) {
				trAlbumData = null;
			}
		}

		// determine if track or album
		let type: BandcampItemType.Album | BandcampItemType.Track | null = null;
		if(ldJson) {
			let ldType = ldJson['@type'];
			if(ldType === PrivBandcampMediaLDJsonType.MusicAlbum || ldType === 'album' || ldType === 'Album') {
				type = BandcampItemType.Album;
			}
			else if(ldType === PrivBandcampMediaLDJsonType.MusicRecording || ldType === 'track' || ldType === 'Track') {
				type = BandcampItemType.Track;
			}
		}
		if(trAlbumData) {
			const trItemType = trAlbumData['item_type'];
			if(trItemType === BandcampItemType.Album || trItemType === BandcampItemType.Track) {
				type = trItemType;
			} else if(trItemType === 'song') {
				type = BandcampItemType.Track;
			}
		}
		if(type == null) {
			if(trackTable.index() === -1) {
				type = BandcampItemType.Track;
			} else {
				type = BandcampItemType.Album;
			}
		}

		// get item ID
		let itemId: string | undefined = undefined;
		const bcPageProps: any = (() => {
			let bcPageProps = $('meta[name="bc-page-properties"]').attr('content');
			if(bcPageProps) {
				return JSON.parse(bcPageProps);
			}
			return bcPageProps;
		})();
		if(bcPageProps && bcPageProps.item_id) {
			itemId = ''+bcPageProps.item_id;
		}
		if(itemId == null && ldJson && ldJson.additionalProperty instanceof Array) {
			const idProp = ldJson.additionalProperty.find((prop: any) => (
				prop.name === 'item_id'
				|| (type === BandcampItemType.Track && prop.name === 'track_id')
				|| (type === BandcampItemType.Album && prop.name === 'album_id')));
			if(idProp && idProp.value) {
				itemId = ''+idProp.value;
			}
		}

		// get item URL
		let itemURL: string | null = url;
		let urlType = this.parseType(url, $);
		if(urlType !== 'track' && urlType !== 'album') {
			const ogType = $('meta[property="og:type"]').attr('content');
			if(ogType === 'album' || ogType === 'track' || ogType === 'song') {
				itemURL = $('meta[property="og:url"]').attr('content') ?? null;
			}
		}
		if(ldJson) {
			// check for the likely non-existant URL field first
			const ldJsonURL = (ldJson as any)['url'];
			if(typeof ldJsonURL === 'string') {
				itemURL = ldJsonURL;
			} else {
				// fallback to @id, which is just a URL
				const ldJsonId = ldJson['@id'];
				if(typeof ldJsonId === 'string' && ldJsonId.startsWith('http')) {
					itemURL = ldJsonId;
				}
			}
		}
		if(trAlbumData) {
			const trURL = trAlbumData.url;
			if(typeof trURL === 'string' && trURL) {
				itemURL = trURL;
			}
		}
		if(!itemURL) {
			throw new Error("Unable to parse item URL");
		}
		if(itemURL.startsWith('/')) {
			itemURL = this.cleanUpURL(UrlUtils.resolve(url, itemURL));
		} else if(itemURL) {
			itemURL = this.cleanUpURL(itemURL);
		}

		// find item name
		let itemName = nameSection.find('.trackTitle').text().trim();
		if(ldJson) {
			const ldJsonName = ldJson.name;
			if(typeof ldJsonName === 'string' && ldJsonName) {
				itemName = ldJsonName;
			}
		}
		
		// find artist / album name
		let artistName: string | undefined = undefined;
		let artistURL: string | undefined = undefined;
		let albumName: string | undefined = undefined;
		let albumURL: string | undefined = undefined;
		const subtitleTag = nameSection.find('h2 + h3');
		let subArtistTag: (cheerio.Cheerio<Element> | null) = null;
		let subAlbumTag: (cheerio.Cheerio<Element> | null) = null;
		const subtitleTagContents = subtitleTag.contents();
		subtitleTag.find('span a').each((index, tagHtml) => {
			let tagHtmlParent = $(tagHtml).parent();
			let contentIndex = null;
			for(let j=1; j<subtitleTagContents.length; j++) {
				const cmpNode = subtitleTagContents[j];
				if($(cmpNode).is($(tagHtmlParent))) {
					contentIndex = j;
					break;
				}
			}
			if(contentIndex == null || contentIndex == 0) {
				return;
			}
			let prefixTag = subtitleTagContents[contentIndex-1];
			const prefix = $(prefixTag).text().trim().toLowerCase();
			if(prefix === 'from') {
				subAlbumTag = $(tagHtml);
			}
			else if(prefix === 'by') {
				subArtistTag = $(tagHtml);
			}
		});
		subArtistTag = subArtistTag as any as (cheerio.Cheerio<Element> | null);
		if(subArtistTag != null && subArtistTag.index() !== -1) {
			artistName = subArtistTag.text().trim();
			artistURL = subArtistTag.attr('href');
		}
		subAlbumTag = subAlbumTag as any as (cheerio.Cheerio<Element> | null);
		if(subAlbumTag != null && subAlbumTag.index() !== -1) {
			albumName = subAlbumTag.text().trim();
			albumURL = subAlbumTag.attr('href');
		}
		const fromAlbumTag = nameSection.find('.fromAlbum');
		if(fromAlbumTag.index() !== -1) {
			let fromAlbumAnchor = null;
			if(fromAlbumTag[0].name === 'a') {
				fromAlbumAnchor = fromAlbumTag;
			} else {
				const fromAlbumParent = fromAlbumTag.parent();
				if(fromAlbumParent[0].name === 'a') {
					fromAlbumAnchor = fromAlbumParent;
				}
			}
			let fromAlbumName = fromAlbumTag.text().trim();
			if(fromAlbumName) {
				albumName = fromAlbumName;
			}
			if(fromAlbumAnchor != null && fromAlbumAnchor.index() !== -1) {
				const fromAlbumHref = fromAlbumAnchor.attr('href');
				if(fromAlbumHref) {
					albumURL = fromAlbumHref;
				}
			}
		}
		if(ldJson) {
			const ldByArtist = ldJson.byArtist;
			if(ldByArtist) {
				const ldArtistName = ldByArtist.name;
				if(typeof ldArtistName === 'string' && ldArtistName) {
					artistName = ldArtistName;
				}
				// check for likely non-existant url field first
				const ldArtistURL = (ldByArtist as any)['url'];
				if(typeof ldArtistURL === 'string' && ldArtistURL) {
					artistURL = ldArtistURL;
				} else {
					// fallback to @id, which is just a URL
					const ldArtistId = ldByArtist['@id'];
					if(typeof ldArtistId === 'string' && ldArtistId.startsWith('http')) {
						artistURL = ldArtistId;
					}
				}
			}
			const ldInAlbum = (ldJson as PrivBandcampTrackLDJson).inAlbum;
			if(ldInAlbum) {
				const ldAlbumName = ldInAlbum.name;
				if(typeof ldAlbumName === 'string' && ldAlbumName) {
					albumName = ldAlbumName;
				}
				// check for likely non-existant url field first
				const ldAlbumURL = (ldInAlbum as any)['url'];
				if(typeof ldAlbumURL === 'string' && ldAlbumURL) {
					albumURL = ldAlbumURL;
				} else {
					// fallback to @id, which is just a URL
					const ldAlbumId = ldInAlbum['@id'];
					if(typeof ldAlbumId === 'string' && ldAlbumId.startsWith('http')) {
						albumURL = ldAlbumId;
					}
				}
			}
		}
		if(artistName == null) {
			throw new Error("Unable to parse artistName");
		}
		if(!artistURL) {
			throw new Error("Unable to parse artistURL");
		}
		// resolve artist url
		artistURL = this.cleanUpURL(UrlUtils.resolve(url, artistURL));
		// resolve album url
		if(albumURL) {
			albumURL = this.cleanUpURL(UrlUtils.resolve(url, albumURL));
		}

		// find tags
		const tags: string[] = [];
		$('.tralbum-tags a[class="tag"]').each((index, tagHtml) => {
			tags.push($(tagHtml).text().trim());
		});
		
		// get release date
		let releaseDate: string | undefined = undefined;
		if(ldJson) {
			const ldDatePublished = ldJson.datePublished;
			if(typeof ldDatePublished === 'string' && ldDatePublished) {
				releaseDate = ldDatePublished;
			}
		}
		if(releaseDate == null) {
			const releasedLinePrefix = "released ";
			const releasedLine = trAlbumCreditsLines.find((line) => {
				if(line && line.startsWith(releasedLinePrefix) && line.length > releasedLinePrefix.length) {
					return true;
				}
				return false;
			});
			if(releasedLine) {
				releaseDate = releasedLine.substring(releasedLinePrefix.length).trim() || undefined;
			}
		}
		if(releaseDate) {
			releaseDate = this.formatDate(releaseDate);
		}

		// get description
		let description: string = "";
		const tralbumAbout = $('.tralbum-about');
		if(tralbumAbout != null && tralbumAbout.index() !== -1) {
			description = tralbumAbout.text();
		}
		if(!description && ldJson) {
			const ldDescription = ldJson.description;
			if(typeof ldDescription === 'string') {
				description = ldDescription;
			}
		}
		if(!description && trAlbumData) {
			const trCurrent = trAlbumData.current;
			if(trCurrent) {
				const trDescription = trCurrent['about'];
				if(typeof trDescription === 'string') {
					description = trDescription;
				}
			}
		}

		// get track num
		let trackNumber: number | undefined = undefined;
		if(type === BandcampItemType.Track) {
			if (ldJson != null && ldJson.additionalProperty instanceof Array) {
				const tracknumProp = ldJson.additionalProperty.find((prop: any) => (prop.name === 'tracknum'));
				if(tracknumProp && typeof tracknumProp.value === 'number') {
					trackNumber = tracknumProp.value;
				}
			}
			if(trackNumber == null && trAlbumData?.current?.track_number != null) {
				trackNumber = trAlbumData.current.track_number;
			}
		}
		
		// if item is a single, set album name / url as self
		if(type === BandcampItemType.Track && (subAlbumTag == null || subAlbumTag.index() === -1)
			&& (fromAlbumTag == null || fromAlbumTag.index() === -1)
			&& (albumName == null || albumName === itemName) && albumURL == null
			&& (trackNumber == null || trackNumber === 1 || trackNumber === 0)) {
			albumName = itemName;
			albumURL = itemURL;
			trackNumber = undefined;
		}

		// make item object with basic data
		const item = {
			id: itemId,
			type: type,
			url: itemURL,
			name: itemName,
			artistName,
			artistURL,
			images: [] as BandcampImage[],
			tags,
			description: description ?? "",
			releaseDate: releaseDate ?? undefined
		};

		// add optional properties
		if(type === BandcampItemType.Track) {
			const track = item as BandcampTrack;
			if(trackNumber != null) {
				track.trackNumber = trackNumber;
			}
			if(albumName != null) {
				track.albumName = albumName;
			}
			if(albumURL) {
				track.albumURL = albumURL;
			}
		}

		// add images
		const tralbumArt = $('#tralbumArt');
		const largeImageURL = tralbumArt.find('a.popupImage').attr('href');
		if(largeImageURL) {
			item.images.push({
				url: largeImageURL,
				size: BandcampImageSize.Large,
			});
		}
		if(ldJson) {
			let ldJsonImages: string | string[] | null = ldJson.image;
			if(typeof ldJsonImages === 'string') {
				ldJsonImages = [ ldJsonImages ];
			}
			if(ldJsonImages instanceof Array) {
				for(const ldJsonImage of ldJsonImages) {
					if(typeof ldJsonImage === 'string' && ldJsonImage.startsWith('http')) {
						if(item.images.find((img) => (img.url == ldJsonImage)) == null) {
							item.images.push({
								url: ldJsonImage,
								size: BandcampImageSize.Large,
							});
						}
					}
				}
			}
		}
		const linkImageSrc = $('link[rel="image_src"]');
		if(linkImageSrc.index() !== -1) {
			const linkImageURL = linkImageSrc.attr('href');
			if(linkImageURL && item.images.find((img) => (img.url == linkImageURL)) == null) {
				item.images.push({
					url: linkImageURL,
					size: BandcampImageSize.Medium,
				});
			}
		}
		const metaImage = $('meta[property="og:image"]');
		if(metaImage.index() !== -1) {
			const metaImageURL = metaImage.attr('content');
			if(metaImageURL && item.images.find((img) => (img.url == metaImageURL)) == null) {
				item.images.push({
					url: metaImageURL,
					size: BandcampImageSize.Medium,
				});
			}
		}
		const mediumImageURL = tralbumArt.find('img').attr('src');
		if(mediumImageURL && item.images.find((img) => (img.url == mediumImageURL)) == null) {
			item.images.push({
				url: mediumImageURL,
				size: BandcampImageSize.Medium,
			});
		}

		// helper function to parse audio sources
		const parseTrTrackAudioSources = (trTrack: any): BandcampAudioSource[] => {
			const trTrackFile = trTrack['file'];
			if(trTrackFile) {
				const trFileTypes = Object.keys(trTrackFile);
				const audioSources: BandcampAudioSource[] = [];
				for(const trFileType of trFileTypes) {
					const fileURL = trTrackFile[trFileType];
					if(typeof fileURL === 'string' && fileURL) {
						audioSources.push({
							type: trFileType,
							url: fileURL
						});
					}
				}
				return audioSources;
			}
			return [];
		};

		// parse type-specific data
		if(item.type === BandcampItemType.Album) {
			// ALBUM
			const album = item as BandcampAlbum;
			// construct tracks
			let trackHtmls: cheerio.Cheerio<Element>[] = [];
			if(trackTable.index() !== -1) {
				trackTable.find('.track_row_view').each((index, trackHtml) => {
					trackHtmls.push($(trackHtml));
				});
			}
			let ldTracks: PrivBandcampAlbumLDJsonTrack[] = [];
			if(ldJson) {
				const ldTrackObj = (ldJson as PrivBandcampAlbumLDJson).track;
				if(ldTrackObj) {
					const ldItems = ldTrackObj['itemListElement'];
					if(ldItems instanceof Array) {
						ldTracks = ldItems;
					}
				}
			}
			let trTracks: PrivBandcampTRAlbumDataTrack[] = [];
			if(trAlbumData) {
				const trAlbumTracks = trAlbumData['trackinfo'];
				if(trAlbumTracks instanceof Array) {
					trTracks = trAlbumTracks;
				}
			}
			const tracks: BandcampAlbumTrack[] = [];
			for(let i=0; i<trackHtmls.length || i<ldTracks.length || i<trTracks.length; i++) {
				let trackId: string | undefined = undefined;
				let trackURL: string | undefined = undefined;
				let trackName: string | undefined = undefined;
				let trackArtistName: string = album.artistName;
				let trackDuration: number | undefined = undefined;
				let trackPlayable: boolean | undefined = undefined;
				let trackAudioSources: BandcampAudioSource[] | undefined = undefined;
				// get properties from html
				if(i < trackHtmls.length) {
					const trackHtml = trackHtmls[i];
					const trackURLTag = trackHtml.find('.title a');
					const trackTitle = trackHtml.find('.track-title');
					const durationText = trackHtml.find('.title .time').text().trim();
					const playStatus = trackHtml.find('.play_col .play_status');

					if(trackURLTag.index() !== -1) {
						trackURL = trackURLTag.attr('href') || undefined;
						if(trackURL) {
							trackURL = this.cleanUpURL(UrlUtils.resolve(url, trackURL));
						}
					}
					if(trackTitle.index() !== -1) {
						trackName = trackTitle.text().trim();
					}
					if(durationText) {
						const duration = this.parseDurationFromText(durationText);
						if(duration != null) {
							trackDuration = duration;
						}
					}
					if(playStatus.index() !== -1) {
						trackPlayable = playStatus.hasClass('disabled');
					}
				}
				// get properties from LD JSON
				if(i < ldTracks.length) {
					const ldTrack = ldTracks[i];
					const ldTrackItem = ldTrack.item;
					if(ldTrackItem) {
						const ldTrackName = ldTrackItem.name;
						if(typeof ldTrackName === 'string' && ldTrackName) {
							trackName = ldTrackName;
						}
						// check likely non-existant url property
						const ldTrackURL = (ldTrackItem as any)['url'];
						if(typeof ldTrackURL === 'string' && ldTrackURL) {
							trackURL = this.cleanUpURL(UrlUtils.resolve(url, ldTrackURL));
						} else {
							// fallback to @id, which is just a URL
							const ldTrackId = ldTrackItem['@id'];
							if(typeof ldTrackId === 'string' && ldTrackId.startsWith('http')) {
								trackURL = this.cleanUpURL(ldTrackId);
							}
						}
					}
				}
				// get properties from data-tralbum
				if(i < trTracks.length) {
					const trTrack = trTracks[i];
					trackAudioSources = parseTrTrackAudioSources(trTrack);
					if(trackAudioSources.length > 0) {
						trackPlayable = true;
					} else {
						trackPlayable = false;
					}
					const trTrackId = trTrack.id;
					if(trTrackId) {
						trackId = ''+trTrackId;
					}
					const trTrackTitle = trTrack.title;
					if(typeof trTrackTitle === 'string' && trTrackTitle) {
						trackName = trTrackTitle;
					}
					const trTrackDuration = trTrack.duration;
					if(typeof trTrackDuration === 'number' && trTrackDuration) {
						trackDuration = trTrackDuration;
					}
					const trTrackURL = trTrack.title_link;
					if(typeof trTrackURL === 'string' && trTrackURL) {
						trackURL = this.cleanUpURL(UrlUtils.resolve(url, trTrackURL));
					}
				}
				// attempt to split track name into artist and track name
				if(trackName) {
					let nameSlug = null;
					if(trackURL) {
						const urlParts = UrlUtils.parse(trackURL);
						const prefixTrim = "/track/"
						if(urlParts.pathname && urlParts.pathname.startsWith(prefixTrim)) {
							nameSlug = urlParts.pathname.substring(prefixTrim.length);
							while(nameSlug.startsWith('/')) {
								nameSlug = nameSlug.substring(1);
							}
							while(nameSlug.endsWith('/')) {
								nameSlug = nameSlug.substring(0, nameSlug.length-1);
							}
							const slashIndex = nameSlug.indexOf('/');
							if(slashIndex != -1) {
								nameSlug = nameSlug.substring(0, slashIndex);
							}
						}
					}
					if(nameSlug != null) {
						// find the correct dash index to split the name and artist
						const dashSearchStr = " - ";
						let dashSearchStartIndex = 0;
						while(true) {
							const dashIndex = trackName.indexOf(dashSearchStr, dashSearchStartIndex);
							if(dashIndex == -1) {
								break;
							}
							// if the slugified track name matches the expected slug, this is the dash index where the track name should get split
							const possibleName = trackName.substring(dashIndex+dashSearchStr.length);
							const cmpNameSlug = this.slugify(possibleName);
							if(cmpNameSlug === nameSlug || (cmpNameSlug.length >= (nameSlug.length / 2) && nameSlug.startsWith(cmpNameSlug))) {
								const artistName = trackName.substring(0, dashIndex);
								trackName = possibleName;
								trackArtistName = artistName;
								break;
							}
							dashSearchStartIndex = dashIndex + dashSearchStr.length;
						}
					}
				}
				// validate properties
				if(!trackURL) {
					throw new Error(`Could not parse URL for track ${i+1}`);
				}
				if(trackName == null) {
					throw new Error(`Could not parse name for track ${i+1}`)
				}
				// create track object
				const track: BandcampAlbumTrack = {
					id: trackId,
					type: BandcampItemType.Track,
					url: trackURL,
					name: trackName,
					images: album.images,
					albumName: album.name,
					albumURL: album.url,
					artistName: trackArtistName,
					artistURL: album.artistURL as string,
					trackNumber: (i + 1),
					duration: trackDuration,
					audioSources: trackAudioSources,
					playable: trackPlayable
				};
				// append track
				tracks.push(track);
			}
			album.tracks = tracks;
			return album;
		}
		else if(item.type === BandcampItemType.Track) {
			// TRACK
			const track = item as BandcampTrack;
			// get properties from data-tralbum
			if(trAlbumData) {
				const trTracks = trAlbumData['trackinfo'];
				if(trTracks instanceof Array && trTracks.length > 0) {
					const trTrack = trTracks[0];
					const audioSources = parseTrTrackAudioSources(trTrack);
					track.audioSources = audioSources;
					if(audioSources.length > 0) {
						track.playable = true;
					} else {
						track.playable = false;
					}
					const trTrackDuration = trTrack['duration'];
					if(typeof trTrackDuration === 'number' && trTrackDuration) {
						track.duration = trTrackDuration;
					}
					const trackNum = trTrack['track_num'];
					if(typeof trackNum === 'number') {
						track.trackNumber = trackNum;
					}
				}

				const current = trAlbumData['current'];
				if(current) {
					const trackNum = current.track_number;
					if(typeof trackNum === 'number') {
						track.trackNumber = trackNum;
					}
				}
			}
			return track;
		}
		console.error(`Unrecognized item type ${item.type} for url ${url}`);
		return item as any;
	}



	parseArtistInfo(url: string, $: cheerio.CheerioAPI): BandcampArtist | null {
		// band_id
		const artistID: string | undefined = $('#contact-tracker-data[data-band-id]').attr('data-band-id') || undefined;

		// bio
		const bioContainer = $('#bio-container');
		if(bioContainer.index() === -1) {
			return null;
		}
		const bandNameLocation = bioContainer.find('#band-name-location');

		// navbar items
		const navBarArtists = $('#band-navbar a[href="/artists"]');
		let isLabel = false;
		if(navBarArtists.index() !== -1) {
			isLabel = true;
		}

		// images
		let images: BandcampImage[] = [];
		const popupImage = bioContainer.find('a.popupImage');
		if(popupImage.index() !== -1) {
			const popupImageDims = popupImage.attr('data-image-size') || "";
			let [ popupImageWidth, popupImageHeight ] = popupImageDims.split(',').map((dimension) => {
				const val = parseInt(dimension);
				if(!val) {
					return undefined;
				}
				return val;
			});

			const imageURL = popupImage.attr('href');
			if(imageURL) {
				images.push({
					url: imageURL,
					width: popupImageWidth,
					height: popupImageHeight,
					size: BandcampImageSize.Large,
				});
			}

			const smallImageURL = popupImage.find('img.band-photo').attr('src');
			if(smallImageURL) {
				const defaultImageWidth = (popupImageWidth && popupImageHeight) ?
					Math.round((popupImageWidth >= popupImageHeight) ? 120 : (120 * popupImageWidth / popupImageHeight))
					: undefined;
				const defaultImageHeight = (popupImageWidth && popupImageHeight) ?
					Math.round((popupImageHeight >= popupImageWidth ) ? 120 : (120 * popupImageHeight / popupImageWidth))
					: undefined;
				images.push({
					url: smallImageURL,
					width: defaultImageWidth,
					height: defaultImageHeight,
					size: BandcampImageSize.Small,
				});
			}
		}

		return {
			id: artistID,
			type: (isLabel) ? BandcampItemType.Label : BandcampItemType.Artist,
			url: this.cleanUpURL(UrlUtils.resolve(url, '/')),
			name: bandNameLocation.find('.title').text().trim(),
			location: bandNameLocation.find('.location').text().trim() || undefined,
			description: bioContainer.find('#bio-text').text().trim(),
			images: images,
			shows: $('#showography > ul > li').toArray().map((showHtml): BandcampArtistShow => {
				const showTag = $(showHtml);
				return {
					date: showTag.find('.showDate').text().trim(),
					url: showTag.find('.showVenue a').attr('href') as string,
					venueName: showTag.find('.showVenue a').text().trim(),
					location: showTag.find('.showLoc').text().trim()
				};
			}),
			links: $('#band-links > li').toArray().map((bandLinkHtml): BandcampLink => {
				const bandLinkTag = $(bandLinkHtml);
				const bandLink = bandLinkTag.find('a');
				return {
					url: bandLink.attr('href') as string,
					name: bandLink.text().trim()
				};
			}),
			isLabel: isLabel
		};
	}



	parseAlbumList(url: string, $: cheerio.CheerioAPI): BandcampArtistPageItem[] | null {
		const albumsArtistName = $('#bio-container #band-name-location .title').text().trim() || undefined;
		const basicAlbumInfos: BandcampArtistPageItem[] = [];
		const musicGrid = $('.music-grid');
		musicGrid.children('li').each((index, albumHtml) => {
			const albumTag = $(albumHtml);
			// parse item URL
			let itemURL = albumTag.find('a').attr('href');
			itemURL = (itemURL ? this.cleanUpURL(UrlUtils.resolve(url,itemURL)) : undefined);
			// parse item type
			const dataItemId = albumTag.attr('data-item-id');
			let itemType: (BandcampItemType.Track | BandcampItemType.Album | undefined) = dataItemId?.startsWith('track') ? BandcampItemType.Track : dataItemId?.startsWith('album') ? BandcampItemType.Album : undefined;
			if(!itemType && itemURL) {
				const urlParts = UrlUtils.parse(itemURL);
				itemType = urlParts.pathname?.startsWith('/track/') ? BandcampItemType.Track : urlParts.pathname?.startsWith('/album/') ? BandcampItemType.Album : undefined;
			}
			// parse art
			const albumArtImage = albumTag.find('.art img');
			const albumArtURL = (albumArtImage.index() !== -1) ? (albumArtImage.attr('data-original') || albumArtImage.attr('src')) : undefined;
			// parse other properties
			let titleHtml = albumTag.find('.title');
			const artistNameHtml = titleHtml.find('span[class="artist-override"]');
			const titleText = titleHtml.clone().find('span[class="artist-override"]').remove().end().text().trim();
			const artistNameText = ((artistNameHtml.index() !== -1) ? artistNameHtml.text().trim() : albumsArtistName);
			const artistURL = itemURL ? this.cleanUpURL(UrlUtils.resolve(itemURL, '/')) : undefined;
			basicAlbumInfos.push({
				id: dataItemId?.replace(/^(album|track)-/, '') as string,
				type: itemType as (BandcampItemType.Track | BandcampItemType.Album),
				url: itemURL as string,
				name: titleText,
				artistName: artistNameText as string,
				artistURL: artistURL as string,
				images: albumArtURL ? [
					{
						url: albumArtURL,
						size: BandcampImageSize.Small,
					}
				] : []
			});
		});

		const pageDataJson = musicGrid.attr('data-initial-values');
		let pageData;
		try {
			pageData = pageDataJson ? JSON.parse(pageDataJson) : undefined;
		} catch(error) {
			pageData = null;
		}
		if(pageData) {
			return pageData.map((album: any): BandcampArtistPageItem => {
				const matchIndex = basicAlbumInfos.findIndex((albumInfo) => (albumInfo.id != null && albumInfo.id == album.id));
				let basicAlbumInfo: BandcampArtistPageItem | {[key: string]: any} = {};
				if(matchIndex !== -1) {
					basicAlbumInfo = basicAlbumInfos[matchIndex];
					basicAlbumInfos.splice(matchIndex, 1);
				}
				let itemURL: string | undefined = (basicAlbumInfo.url || album.page_url);
				itemURL = itemURL ? this.cleanUpURL(UrlUtils.resolve(url, itemURL)) : undefined;
				return {
					id: basicAlbumInfo.id || album.id,
					type: album.type || basicAlbumInfo.type,
					name: album.title || basicAlbumInfo.name,
					url: itemURL as string,
					artistName: album.artist || album.band_name || basicAlbumInfo.artistName || albumsArtistName,
					artistURL: basicAlbumInfo.artistURL,
					images: basicAlbumInfo ? basicAlbumInfo.images : [],
					releaseDate: this.formatDate(album.release_date)
				};
			});
		}
		else if(musicGrid.index() !== -1) {
			return basicAlbumInfos;
		}
		else {
			return null;
		}
	}



	parseItemDataFromURL(url: string, type: BandcampItemType, data: Buffer) {
		const dataString = data.toString();
		if(!dataString) {
			throw new Error("Unable to get data from url");
		}
		const $ = cheerio.load(dataString);
		return this.parseItemFromURL(url, type, $);
	}
	parseItemFromURL(url: string, type: BandcampItemType, $: cheerio.CheerioAPI): BandcampTrack | BandcampAlbum | BandcampArtist | BandcampFan | null {
		if(type === BandcampItemType.Track || type === BandcampItemType.Album) {
			// parse track or album data
			let item = this.parseTrackInfo(url, $);
			if(!item) {
				throw new Error("Unable to parse track data");
			}
			item.artist = this.parseArtistInfo(url, $) || undefined;
			// if item is a single, and we were requesting an album, mutate into an album
			const itemAsTrack = item as BandcampTrack;
			if(itemAsTrack.type === BandcampItemType.Track && type === BandcampItemType.Album && ((!itemAsTrack.albumName && !itemAsTrack.albumURL) || (itemAsTrack.url && itemAsTrack.albumURL === itemAsTrack.url))) {
				item = {
					//id: itemAsTrack.id, // TODO figure out if we should use the same ID for the album
					type: BandcampItemType.Album,
					url: itemAsTrack.url,
					name: itemAsTrack.name,
					images: itemAsTrack.images,
					artistName: itemAsTrack.artistName,
					artistURL: itemAsTrack.artistURL,
					artist: itemAsTrack.artist,
					tracks: [ itemAsTrack as BandcampAlbumTrack ],
					tags: itemAsTrack.tags,
					description: itemAsTrack.description
				};
			}
			return item;
		}
		else if(type === BandcampItemType.Artist) {
			const artist = this.parseArtistInfo(url, $);
			if(!artist) {
				throw new Error("Unable to parse artist data");
			}
			const albums = this.parseAlbumList(url, $);
			if(albums) {
				artist.albums = albums;
			}
			else {
				// sometimes artist homepage is just a single album
				const album = this.parseTrackInfo(url, $);
				if(album) {
					artist.albums = [ album as BandcampArtistPageItem ];
				}
			}
			return artist;
		}
		else if(type === BandcampItemType.Fan) {
			const fan = this.parseFanHtml(url, $, null);
			return fan;
		}
		else {
			const artist = this.parseArtistInfo(url, $);
			return artist;
		}
	}



	parseDurationFromText(durationText: string): number | null {
		const durationParts = durationText.split(':');
		let durationPart = null;
		let duration = 0;
		let partCount = 0;
		while(durationPart = durationParts.pop()) {
			if(durationPart.length == 0) {
				continue;
			}
			const durationPartNum = parseInt(durationPart);
			if(isNaN(durationPartNum)) {
				return null;
			}
			switch(partCount) {
				case 0:
					duration += durationPartNum;
					break;
	
				case 1:
					duration += durationPartNum * 60;
					break;
	
				case 2:
					duration += durationPartNum * 60 * 60;
					break;
			}
			partCount += 1;
		}
		return duration;
	}



	parseCDUILink($: cheerio.CheerioAPI): string | null {
		let scriptTags: cheerio.Cheerio<Element>[] = [];
		$('script').each((index, scriptHtml) => {
			const tag = $(scriptHtml);
			const src = tag.attr('src');
			if(src && src.startsWith('https://bandcamp.com/cd_ui?')) {
				scriptTags.push(tag);
			}
		});
		if(scriptTags.length === 0) {
			return null;
		}
		return scriptTags[0].attr('src') || null;
	}

	parseStreamFilesFromCDUI(data: string): any | null {
		const regex = /OwnerStreaming\.init\(.*\);/g;
		const matches = data.match(regex);
		if(!matches || matches.length === 0) {
			return null;
		}
		let match = matches[0];
		const prefix = 'OwnerStreaming.init(';
		if(match.startsWith(prefix)) {
			match = match.substring(prefix.length);
		}
		const suffix = ');';
		if(match.endsWith(suffix)) {
			match = match.substring(0, match.length-suffix.length).trim();
		}
		try {
			return JSON.parse(match);
		} catch(error) {
			return null;
		}
	}

	attachStreamsToTracks(tracks: (BandcampTrack | BandcampAlbumTrack)[], streams: {[key: string]: any}) {
		if(typeof streams !== 'object') {
			return;
		}
		const getStreamFiles = (id: string | undefined, index: number) => {
			if(id == null) {
				const keys = Object.keys(streams);
				return streams[keys[index]];
			}
			return streams[id];
		};
		let i=0;
		for(const track of tracks) {
			const streamFiles = getStreamFiles(track.id, i);
			if(typeof streamFiles !== 'object') {
				i++;
				continue;
			}
			const streamFileKeys = Object.keys(streamFiles);//.sort();
			if(streamFileKeys.length > 0) {
				if(!track.audioSources) {
					track.audioSources = [];
				}
				for(const streamFileType of streamFileKeys) {
					const url = streamFiles[streamFileType];
					// avoid duplicate audio sources
					if(track.audioSources.find((source) => (source.url === url || source.type === streamFileType))) {
						continue;
					}
					track.audioSources.push({
						type: streamFileType,
						url: url
					});
				}
				if(track.audioSources.length > 0) {
					track.playable = true;
				} else {
					track.playable = false;
				}
			}
			i++;
		}
	}

	parseFanControlsFromCDUI(data: string): any | null {
		const regex = /FanControls\.init\(\{.*\}\);/g;
		const matches = data.match(regex);
		if(!matches || matches.length === 0) {
			return null;
		}
		let match = matches[0];
		const prefix = 'FanControls.init(';
		if(match.startsWith(prefix)) {
			match = match.substring(prefix.length);
		}
		const suffix = ');';
		if(match.endsWith(suffix)) {
			match = match.substring(0, match.length-suffix.length);
		}
		try {
			return JSON.parse(`[${match}]`)[0];
		} catch(error) {
			return null;
		}
	}



	parseIdentitiesFromPage($: cheerio.CheerioAPI): BandcampIdentities {
		const homePageDataJson = $('#pagedata').attr('data-blob');
		if(!homePageDataJson) {
			throw new Error("could not get page data to scrape identities");
		}
		const pageData = JSON.parse(homePageDataJson) as { identities: PrivBandcampIdentities };
		return this.parseIdentitiesFromJson(pageData);
	}

	parseIdentitiesFromJson(pageData: { identities: PrivBandcampIdentities }): BandcampIdentities {
		if(!pageData || !pageData.identities) {
			throw new Error("could not get identities from page data");
		}
		const identities: BandcampIdentities = {};
		// parse fan identity
		const fanIdentity = pageData.identities.fan;
		if(fanIdentity) {
			let images: BandcampImage[] | undefined = undefined;
			if(fanIdentity.photo != null) {
				if(typeof fanIdentity.photo === 'string' && (fanIdentity.photo as string).startsWith("http")) {
					images = [
						{
							url: fanIdentity.photo,
							size: BandcampImageSize.Medium,
						}
					];
				} else if(typeof fanIdentity.photo === 'string' || typeof fanIdentity.photo === 'number') {
					const imageId = this.padImageId(fanIdentity.photo);
					images = this.createImagesFromImageId(imageId);
				}
			}
			identities.fan = {
				id: ''+fanIdentity.id,
				url: fanIdentity.url,
				username: fanIdentity.username,
				private: fanIdentity.private,
				verified: fanIdentity.verified,
				photoId: fanIdentity.photo,
				name: fanIdentity.name,
				images: images
			};
		}
		// return identities
		return identities;
	}



	parseFanPageDataFanJson(fanData: PrivBandcampFan$FanData | null, fan: BandcampFan): BandcampFan {
		if(!fanData) {
			return fan;
		}
		if(!fan) {
			fan = {} as BandcampFan;
		}
		if(fanData.fan_id) {
			fan.id = ''+fanData.fan_id;
		}
		if(fanData.trackpipe_url) {
			fan.url = fanData.trackpipe_url;
		}
		if(fanData.name) {
			fan.name = fanData.name;
		}
		if(fanData.username) {
			fan.username = fanData.username;
		}
		if(typeof fanData.bio === 'string') {
			fan.description = fanData.bio;
		}
		if(fanData.photo && typeof fanData.photo === 'object' && fanData.photo.image_id) {
			const imageId = this.padImageId(fanData.photo.image_id);
			fan.images = this.createImagesFromImageId(imageId);
		}
		return fan;
	}

	parseFanPageDataSection<T>(listData: any, itemCache: any, existingSection: BandcampFan$PageSection<T> | null | undefined, mapper: (itemIdentifier: string) => T): BandcampFan$PageSection<T> | null {
		if(!listData || !(listData.sequence || listData.pending_sequence)
		  || (listData.hidden === true && listData.item_count === 0)
		  || (listData.item_count === null && (listData.sequence || []).length === 0 && (listData.pending_sequence || []).length === 0)
		  || (!listData.last_token && listData.item_count === 0)) {
			return existingSection || null;
		}
		// parse items
		const section: BandcampFan$PageSection<T> = existingSection || ({} as BandcampFan$PageSection<T>);
		if(typeof listData.last_token === 'string') {
			section.lastToken = listData.last_token;
		}
		if(typeof listData.item_count === 'number') {
			section.itemCount = listData.item_count;
		}
		if(typeof listData.batch_size === 'number') {
			section.batchSize = listData.batch_size;
		}
		let sequence = listData.sequence;
		if((!(sequence instanceof Array) || sequence.length === 0) && listData.pending_sequence && listData.pending_sequence instanceof Array) {
			sequence = listData.pending_sequence;
		}
		if(sequence && sequence instanceof Array && itemCache) {
			let items: Array<T> | null = sequence.map(mapper);
			if(items.length > 0) {
				// if everything we mapped was null, we shouldn't set the list
				let allNulls = true;
				for(const item of items) {
					if(item) {
						allNulls = false;
						break;
					}
				}
				if(allNulls) {
					items = null;
				}
			}
			// filter null items
			if(items) {
				items = items.filter((item) => {
					return (!!item); // item must be truthy
				});
				section.items = items;
			}
		}
		return section;
	}

	parseFanPageDataMediaSectionJson(
		listData: PrivBandcampFan$CollectionBatchData,
		itemCache: {[itemid: string]: PrivBandcampFan$CollectionItemInfo},
		trackLists: ({ [itemid:string]: [PrivBandcampFan$AlbumTrack] } | null | undefined),
		trAlbumLookup: PrivBandcampAPI$Fan$CollectionSummary$TRAlbumLookup,
		existingSection: (BandcampFan$CollectionSection | null | undefined)): (BandcampFan$CollectionSection | null) {
		const existingItems = (existingSection || {}).items || [];
		const page = this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier: string): BandcampFan$CollectionNode => {
			// get item data
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				throw new Error(`couldn't find matching item with ID ${itemIdentifier} in itemCache`);
			}
			// get tralbum data
			const trAlbumData = trAlbumLookup[itemIdentifier];
			// parse item type
			let itemType = itemData.item_type;
			if(!itemType && itemData.item_url) {
				itemType = this.parseType(itemData.item_url);
			}
			if(itemType === 'song') {
				itemType = BandcampItemType.Track;
			} else if(itemType == 'band') {
				itemType = BandcampItemType.Artist;
			}
			// parse item url
			const itemURL = itemData.item_url ? this.cleanUpURL(itemData.item_url) : undefined;
			// find existing item
			let itemNode: BandcampFan$CollectionNode = ({} as BandcampFan$CollectionNode);
			let item = ({} as (BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum));
			if(itemData.item_id != null) {
				const existingItemIndex = existingItems.findIndex((cmpNode) => {
					if(itemData.item_id && cmpNode.itemId && (itemData.item_id as any) == (cmpNode.itemId as any)) {
						return true;
					}
					return false;
				});
				if(existingItemIndex !== -1) {
					itemNode = existingItems[existingItemIndex];
					item = itemNode.item || item;
					existingItems.splice(existingItemIndex,1);
				}
				item.id = ''+itemData.item_id;
			}
			// attach basic item data
			if(itemType) {
				item.type = itemType as (BandcampItemType.Album | BandcampItemType.Track);
			}
			if(itemURL) {
				item.url = itemURL;
			}
			if(itemData.item_title) {
				item.name = itemData.item_title;
			}
			// attach artist if necessary
			if(itemData.band_name) {
				item.artistName = itemData.band_name;
			}
			if(itemData.item_url) {
				item.artistURL = this.cleanUpURL(UrlUtils.resolve(itemData.item_url, '/'));
			}
			// add photos
			if(itemData.item_art_id) {
				const imageId = 'a'+this.padImageId(itemData.item_art_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			// attach audio sources if item is a track
			if(item.type === BandcampItemType.Track && trackLists) {
				const track = item as BandcampFan$CollectionTrack;
				const trackList = trackLists[itemIdentifier];
				if(trackList && track.id) {
					const trackData = trackList.find((trackData: any) => {
						return trackData.id == track.id;
					});
					if(trackData) {
						if(typeof trackData.title === 'string' && trackData.title) {
							track.name = trackData.title;
						}
						if(typeof trackData.duration === 'number') {
							track.duration = trackData.duration;
						}
						if(typeof trackData.artist === 'string' && trackData.artist) {
							track.artistName = trackData.artist;
						}
						if(typeof trackData.track_number === 'number') {
							track.trackNumber = trackData.track_number;
						}
						if(typeof trackData.file === 'object' && trackData.file) {
							track.audioSources = Object.keys(trackData.file).map((fileType) => {
								return {
									type: fileType,
									url: trackData.file[fileType]
								};
							});
						}
					}
				}
			}
			// attach album info if needed
			if(item.type === BandcampItemType.Track) {
				const track = item as BandcampFan$CollectionTrack;
				if(itemData.album_id === null && (!itemData.url_hints || itemData.url_hints.item_type === 't')) {
					// item is a "single", so make album the same as item
					track.albumURL = item.url;
					track.albumName = item.name;
				} else if(item.url && itemData.url_hints && itemData.url_hints.item_type === 'a' && itemData.url_hints.slug) {
					// add album name / url
					// TODO the only album name we can get from this endpoint is the slug
					//  so update this whenever we get that piece of data
					track.albumURL = this.cleanUpURL(UrlUtils.resolve(track.url, '/album/'+itemData.url_hints.slug));
					track.albumSlug = itemData.url_hints.slug;
					// attempt to get the album name from non-existant field (maybe they'll add it! I hope!)
					if((itemData as any).album_title) {
						track.albumName = (itemData as any).album_title;
					}
					// ensure albumName is null if not set
					else if(!track.albumName) {
						track.albumName = null;
					}
				}
			}

			// build item list node
			itemNode.item = item;
			if(itemData.item_id) {
				itemNode.itemId = ''+itemData.item_id;
			}
			if(itemData.why != null) {
				itemNode.userComment = itemData.why;
			}
			if(trAlbumData && typeof trAlbumData.purchased === 'string' && trAlbumData.purchased) {
				const datePurchased = new Date(trAlbumData.purchased);
				if(datePurchased instanceof Date && !Number.isNaN(datePurchased.getTime())) {
					if(!itemNode.token && trAlbumData.item_id && trAlbumData.item_type) {
						itemNode.token = `${Math.floor(datePurchased.getTime() / 1000)}:${trAlbumData.item_id}:${trAlbumData.item_type[0]}::`;
					}
					if(!itemNode.dateAdded) {
						itemNode.dateAdded = this.formatDate(datePurchased.toISOString()) as string;
					}
				}
			}
			return itemNode;
		});
		// sort page items
		page?.items.sort((a, b) => {
			if(a.dateAdded > b.dateAdded) {
				return -1;
			}
			else if(a.dateAdded < b.dateAdded) {
				return 1;
			}
			return 0;
		});
		return page;
	}


	parseFanPageDataBandsSectionJson(listData: any, itemCache: any, existingSection: BandcampFan$ArtistSection | null): BandcampFan$ArtistSection | null {
		const page = this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier: string): BandcampFan$FollowedArtistNode => {
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				throw new Error(`couldn't find matching artist item with ID ${itemIdentifier} in itemCache`);
			}
			// build basic item data
			let item: BandcampFan$CollectionArtist = {
				type: BandcampItemType.Artist,
				url: this.artistURLHintsToURL(itemData.url_hints) as string,
				id: itemData.band_id,
				name: itemData.name,
				location: itemData.location
			};
			// ensure item url
			if(!item.url) {
				throw new Error("could not parse item URL");
			}
			// add images
			if(itemData.image_id) {
				const imageId = this.padImageId(itemData.image_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			// build item list node
			return {
				itemId: item.id,
				item: item,
				token: itemData.token,
				dateFollowed: (itemData.date_followed ? this.formatDate(itemData.date_followed) : undefined) as string
			};
		});
		// sort page items
		page?.items.sort((a, b) => {
			if(a.dateFollowed > b.dateFollowed) {
				return -1;
			}
			else if(a.dateFollowed < b.dateFollowed) {
				return 1;
			}
			return 0;
		});
		return page;
	}

	parseFanPageDataFansSectionJson(listData: any, itemCache: any, existingSection: BandcampFan$FanSection | null): BandcampFan$FanSection | null {
		const page = this.parseFanPageDataSection(listData, itemCache, existingSection, (itemIdentifier: string): BandcampFan$FollowedFanNode => {
			const itemData = itemCache[itemIdentifier];
			if(!itemData) {
				throw new Error(`couldn't find matching fan item with ID ${itemIdentifier} in itemCache`);
			}
			// build basic item data
			let item: BandcampFan$CollectionFan = {
				type: BandcampItemType.Fan,
				id: ''+itemData.fan_id,
				url: itemData.trackpipe_url,
				name: itemData.name,
				location: itemData.location
			};
			// add images
			if(itemData.image_id) {
				const imageId = this.padImageId(itemData.image_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			// build item list node
			return {
				itemId: item.id,
				item: item,
				token: itemData.token,
				dateFollowed: (itemData.date_followed ? this.formatDate(itemData.date_followed) : undefined) as string
			};
		});
		// sort page items
		page?.items.sort((a, b) => {
			if(a.dateFollowed > b.dateFollowed) {
				return -1;
			}
			else if(a.dateFollowed < b.dateFollowed) {
				return 1;
			}
			return 0;
		});
		return page;
	}



	parseFanTabItemCount($: cheerio.CheerioAPI, sectionSlug: string): number {
		return Number.parseInt($(`#grid-tabs li[data-tab="${sectionSlug}"] .count`).text().trim());
	}


	parseFanCollectionHtml($: cheerio.CheerioAPI, sectionSlug='collection'): BandcampFan$CollectionSection | null {
		// get count
		const count = this.parseFanTabItemCount($, sectionSlug);
		// get section items html
		const itemsWrapperHtml = $(`#${sectionSlug}-items`);
		// check if we have the section or not
		if(itemsWrapperHtml.index() === -1 && (Number.isNaN(count) || count == null)) {
			return null;
		}
		// build section
		const section: BandcampFan$CollectionSection = {} as BandcampFan$CollectionSection;
		// parse items
		if(itemsWrapperHtml.index() !== -1) {
			const items: BandcampFan$CollectionNode[] = [];
			$(`#${sectionSlug}-items > ol.collection-grid > li`).each((index, itemHtml) => {
				const html = $(itemHtml);
				// parse item type
				let itemType = html.attr('data-itemtype');
				if(itemType === 'song') {
					itemType = BandcampItemType.Track;
				} else if(itemType == 'band') {
					itemType = BandcampItemType.Artist;
				}
				// parse item id
				let itemId = html.attr('data-itemid');
				if(itemId) {
					itemId = ''+itemId;
				}
				// parse item name
				let itemName: string | undefined = html.find('.collection-item-title').first().contents().filter(function(){ return this.nodeType === 3; }).text().trim();
				if(!itemName) {
					itemName = html.attr('data-title');
				}
				// parse artist name
				let artistName = html.find('.collection-item-artist').first().contents().filter(function(){ return this.nodeType === 3; }).text().trim();
				const artistPrefix = 'by ';
				if(artistName.startsWith(artistPrefix)) {
					artistName = artistName.substring(artistPrefix.length);
				}
				// build URLs
				let url: string | undefined = html.find('a.item-link[href]').attr('href');
				let albumURL: string | undefined
				let albumSlug: string | undefined
				let artistURL: string | undefined
				if(url) {
					url = this.cleanUpURL(url);
					const urlItemType = this.parseType(url);
					if(itemType === 'track' && urlItemType === 'album') {
						albumURL = this.cleanUpURL(url);
						const lastSlashIndex = albumURL.lastIndexOf('/');
						if(lastSlashIndex !== -1) {
							albumSlug = albumURL.substring(lastSlashIndex+1);
						}
					}
					artistURL = this.cleanUpURL(UrlUtils.resolve(url, '/'));
				}
				// add slug URL if url is missing
				if(!url && itemName && (itemType === 'track' || itemType === 'album') && artistURL) {
					url = this.cleanUpURL(UrlUtils.resolve(artistURL, `/${itemType}/${this.slugify(itemName)}`));
				}
				if(!url) {
					throw new Error(`Failed to parse URL for collection item at index ${index} in ${sectionSlug} section`);
				}
				// build basic item data
				let item: BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum = {
					id: itemId as string,
					type: itemType as (BandcampItemType.Album | BandcampItemType.Track),
					url: url,
					name: itemName as string,
					artistName,
					artistURL: artistURL as string,
					albumURL: albumURL as string,
					albumSlug: albumSlug as string
				};
				// add images
				const imageURL = html.find('img.collection-item-art').attr('src');
				if(imageURL) {
					item.images = [
						{
							url: imageURL,
							size: BandcampImageSize.Large,
						}
					];
				}
				// build list item node
				const itemNode: BandcampFan$CollectionNode = {
					itemId: item.id,
					item: item
				} as BandcampFan$CollectionNode;

				// add token / date added
				const token = html.attr('data-token');
				if(token) {
					itemNode.token = token;
					const tokenTimestamp = Number.parseFloat((''+token).split(':')[0]);
					if(!Number.isNaN(tokenTimestamp)) {
						const dateAdded = new Date(tokenTimestamp * 1000);
						if(dateAdded instanceof Date && !Number.isNaN(dateAdded.getTime())) {
							itemNode.dateAdded = this.formatDate(dateAdded.toISOString());
						}
					}
				}

				// append item node
				items.push(itemNode);
			});
			section.items = items;
		}
		// parse count
		if(!Number.isNaN(count)) {
			section.itemCount = count;
		}
		return section;
	}



	parseFanHtmlData(url: string, data: Buffer, collectionSummary: PrivBandcampAPI$Fan$CollectionSummary | null): BandcampFan {
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Could not get data for fan");
		}
		const $ = cheerio.load(dataString);
		return this.parseFanHtml(url, $, collectionSummary);
	}

	parseFanHtml(url: string, $: cheerio.CheerioAPI, collectionSummary: PrivBandcampAPI$Fan$CollectionSummary | null): BandcampFan {
		// parse fan username from url
		let urlParts = UrlUtils.parse(url);
		let username = urlParts.pathname;
		if(username) {
			while(username.startsWith('/')) {
				username = username.substring(1);
			}
			username = username.split('/')[0];
		}
		if(!username) {
			throw new Error("invalid bandcamp fan URL");
		}
		const fanURL = this.cleanUpURL('https://bandcamp.com/'+username);
		// parse fan name
		const fanName = $('#fan-container .fan-bio-inner .name span[data-bind="text: name"]').text().trim();

		// create bandcamp fan
		let fan: BandcampFan = {
			type: BandcampItemType.Fan,
			url: fanURL,
			username,
			name: fanName
		} as BandcampFan;

		// parse fan info html
		let images: BandcampImage[] = [];
		const fanImagePopupLink = $('#fan-container .fan-bio-photo a.popupImage[href]').first().attr('href');
		if(fanImagePopupLink) {
			images.push({
				url: fanImagePopupLink,
				size: BandcampImageSize.Large,
			});
		}
		const fanBioPicSrc = $('#fan-container .fan-bio-pic img').first().attr('src');
		if(fanBioPicSrc) {
			images.push({
				url: fanBioPicSrc,
				size: BandcampImageSize.Small,
			});
		}
		if(images.length > 0) {
			fan.images = images;
		}

		// parse sections html
		fan.collection = this.parseFanCollectionHtml($,'collection');
		fan.wishlist = this.parseFanCollectionHtml($,'wishlist');
		
		// parse pageData json
		let pageData: null | PrivBandcampFan$PageData = null;
		try {
			const pageDataString = $('#pagedata').attr('data-blob');
			if(pageDataString) {
				pageData = JSON.parse(pageDataString);
			}
		} catch(error) {
			// continue on
		}
		if(pageData) {
			// parse fan data
			fan = this.parseFanPageDataFanJson(pageData.fan_data, fan);
			// build fan media sections
			const itemCache = pageData.item_cache;
			const trackLists = pageData.tracklists || {};
			const trAlbumLookup = ((collectionSummary || {}).collection_summary || {}).tralbum_lookup || {};
			fan.collection = this.parseFanPageDataMediaSectionJson(pageData.collection_data, itemCache.collection, trackLists.collection, trAlbumLookup, fan.collection);
			fan.wishlist = this.parseFanPageDataMediaSectionJson(pageData.wishlist_data, itemCache.wishlist, trackLists.wishlist, trAlbumLookup, fan.wishlist);
			fan.hiddenCollection = this.parseFanPageDataMediaSectionJson(pageData.hidden_data, itemCache.hidden, trackLists.hidden, trAlbumLookup, fan.hiddenCollection);
			// build fan artist sections
			fan.followingArtists = this.parseFanPageDataBandsSectionJson(pageData.following_bands_data, itemCache.following_bands, null);
			// build fan sections
			fan.followingFans = this.parseFanPageDataFansSectionJson(pageData.following_fans_data, itemCache.following_fans, null);
			fan.followers = this.parseFanPageDataFansSectionJson(pageData.followers_data, itemCache.followers, (fan.followers ?? null));
		}
		
		return fan;
	}



	parseFanCollectionItemsErrorJson(res: HttpResponse, data: Buffer) {
		// check response code
		if(res.statusCode < 200 || res.statusCode >= 300) {
			const dataString = data ? data.toString() : null;
			if(!dataString) {
				throw new Error(res.statusMessage);
			}
			let resJson = null
			try {
				resJson = JSON.parse(dataString);
			} catch(error) {
				throw new Error(res.statusMessage);
			}
			if(resJson.error_message) {
				throw new Error(resJson.error_message);
			} else if(typeof resJson.error === 'string') {
				throw new Error(resJson.error);
			}
			throw new Error(res.statusMessage);
		}
		// parse json
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Missing data for fan collection items");
		}
		const json = JSON.parse(dataString);
		// check for error
		if(json.error === true) {
			if(json.error_message) {
				throw new Error(json.error_message);
			} else {
				throw new Error("Bad request");
			}
		}
	}

	parseFanCollectionItemsJsonData(res: HttpResponse, data: Buffer): BandcampFan$CollectionPage {
		// check for errors
		this.parseFanCollectionItemsErrorJson(res, data);
		// parse json
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Missing data for fan collection items");
		}
		const json: PrivBandcampAPI$Fan$CollectionItemsResult = JSON.parse(dataString);
		// return items
		return {
			hasMore: json.more_available,
			lastToken: json.last_token,
			items: this.parseFanCollectionItemList((json.items || []), (item, rawItem) => {
				return {
					token: rawItem.token,
					itemId: item.id,
					item: item,
					dateAdded: ((typeof rawItem.added === 'string') ? this.formatDate(rawItem.added) : undefined) as string
				};
			})
		};
	}

	parseFanCollectionItemList<T>(items: PrivBandcampAPI$Fan$CollectionMediaItem[], mapper: (item: BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum, rawItem: PrivBandcampAPI$Fan$CollectionMediaItem) => T): T[] {
		return items.map((itemJson) => {
			let itemType = itemJson.item_type;
			if(itemType === 'song') {
				itemType = BandcampItemType.Track;
			}
			let itemId: string | undefined = undefined;
			if(itemJson.item_id) {
				itemId = ''+itemJson.item_id;
			}
			const item: BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum = {
				id: itemId as string,
				type: itemType as (BandcampItemType.Track | BandcampItemType.Album),
				url: itemJson.item_url,
				name: itemJson.item_title,
				artistName: itemJson.band_name,
				artistURL: itemJson.band_url
			};
			if(itemJson.item_art_id) {
				const imageId = 'a'+this.padImageId(itemJson.item_art_id);
				item.images = this.createImagesFromImageId(imageId);
			}
			if(item.type === BandcampItemType.Track) {
				const track = item as BandcampFan$CollectionTrack;
				if(itemJson.featured_track_duration) {
					track.duration = itemJson.featured_track_duration;
				}
				if(itemJson.featured_track_number) {
					track.trackNumber = itemJson.featured_track_number;
				}
				if(itemJson.album_id) {
					track.albumName = itemJson.album_title;
					if(itemJson.url_hints && itemJson.url_hints.item_type === 'a') {
						if(itemJson.url_hints.custom_domain) {
							track.albumURL = `https://${itemJson.url_hints.custom_domain}/album/${itemJson.url_hints.slug}`;
						} else {
							track.albumURL = `https://${itemJson.url_hints.subdomain}.bandcamp.com/album/${itemJson.url_hints.slug}`;
						}
						track.albumSlug = itemJson.url_hints.slug;
					} else if(track.albumName && track.url) {
						track.albumURL = this.cleanUpURL(UrlUtils.resolve(item.url, '/album/'+this.slugify(track.albumName)));
					}
				}
				if(itemJson.album_id === null) {
					// track is a single
					track.albumName = item.name;
					track.albumURL = item.url;
				}
			}
			// create item node
			return mapper(item, itemJson);
		});
	}

	parseFanCollectionArtistsJsonData(res: HttpResponse, data: Buffer): BandcampFan$FollowedArtistPage {
		// check for errors
		this.parseFanCollectionItemsErrorJson(res, data);
		// parse json
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Missing data for fan collection items");
		}
		const json: PrivBandcampAPI$Fan$FollowingArtistsResult = JSON.parse(dataString);
		// return items
		return {
			hasMore: json.more_available,
			lastToken: json.last_token,
			items: (json.followeers || []).map((itemJson: any): BandcampFan$FollowedArtistNode => {
				const url = this.artistURLHintsToURL(itemJson.url_hints);
				if(!url) {
					throw new Error("unable to find url for item");
				}
				return {
					itemId: (itemJson.band_id ? (''+itemJson.band_id) : undefined) as string,
					token: itemJson.token,
					dateFollowed: this.formatDate(itemJson.date_followed),
					item: {
						id: itemJson.band_id,
						type: BandcampItemType.Artist,
						url: url,
						name: itemJson.name,
						location: itemJson.location,
						images: this.createImagesFromImageId(this.padImageId(itemJson.image_id))
					}
				};
			})
		};
	}

	parseFanCollectionFansJsonData(res: HttpResponse, data: Buffer): BandcampFan$FollowedFanPage {
		// check for errors
		this.parseFanCollectionItemsErrorJson(res, data);
		// parse json
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Missing data for fan collection items");
		}
		const json: PrivBandcampAPI$Fan$FanFollowItemsResult = JSON.parse(dataString);
		// return items
		return {
			hasMore: json.more_available,
			lastToken: json.last_token,
			items: (json.followeers || []).map((itemJson: any): BandcampFan$FollowedFanNode => {
				const url = itemJson.trackpipe_url;
				if(!url) {
					throw new Error("unable to find url for item");
				}
				return {
					itemId: (itemJson.fan_id ? (''+itemJson.fan_id) : undefined) as string,
					token: itemJson.token,
					dateFollowed: this.formatDate(itemJson.date_followed),
					item: {
						id: itemJson.fan_id,
						type: BandcampItemType.Fan,
						url: url,
						name: itemJson.name,
						location: itemJson.location,
						images: this.createImagesFromImageId(this.padImageId(itemJson.image_id))
					}
				};
			})
		};
	}

	parseFanSearchMediaItemsJsonData(res: HttpResponse, data: Buffer): BandcampFan$SearchMediaItemsPage {
		// check for errors
		this.parseFanCollectionItemsErrorJson(res, data);
		// parse json
		const dataString = data ? data.toString() : null;
		if(!dataString) {
			throw new Error("Missing data for fan collection items");
		}
		const json: PrivBandcampAPI$Fan$SearchItemsResult = JSON.parse(dataString);
		// return items
		return {
			items: this.parseFanCollectionItemList((json.tralbums || []), (item, rawItem) => item)
		};
	}


	parseFollowActionError(res: HttpResponse, json: any, action: string) {
		if(res.statusCode < 200 || res.statusCode >= 300) {
			throw new Error(res.statusCode+': '+res.statusMessage);
		}
		if(json.ok === false) {
			if(json.error_message) {
				throw new Error(json.error_message);
			} else if(typeof json.error === 'string') {
				throw new Error(json.error);
			} else {
				throw new Error(action+" request failed: "+JSON.stringify(json));
			}
		}
	}


	parseFanFeedPage(page: PrivBandcampFanFeedPage): BandcampFanFeedPage {
		const trackInfos: {[trackId: string]: PrivBandcampFanFeed$Track} = {};
		if(page.storiesVM.track_list) {
			for(const track of page.storiesVM.track_list) {
				if(track.track_id && !trackInfos[track.track_id]) {
					trackInfos[track.track_id] = track;
				}
			}
		}
		if(page.pageData.track_list) {
			for(const track of page.pageData.track_list) {
				if(track.track_id && !trackInfos[track.track_id]) {
					trackInfos[track.track_id] = track;
				}
			}
		}
		return {
			oldestStoryDate: page.pageData.feed?.oldest_story_date,
			newestStoryDate: page.pageData.feed?.newest_story_date,
			stories: page.storiesVM?.stories?.map((story) => {
				return this.parseFanFeedStory(story, page.storiesVM.fan_info, trackInfos);
			})
		};
	}

	parseFanFeedUpdate(page: PrivBandcampAPI$FanDashFeedUpdates): BandcampFanFeedPage {
		const trackInfos: {[trackId: string]: PrivBandcampFanFeed$Track} = {};
		if(page.stories?.track_list) {
			for(const track of page.stories.track_list) {
				if(track.track_id && !trackInfos[track.track_id]) {
					trackInfos[track.track_id] = track;
				}
			}
		}
		return {
			oldestStoryDate: page.stories?.oldest_story_date,
			newestStoryDate: page.stories?.newest_story_date,
			stories: page.stories?.entries?.map((story) => {
				return this.parseFanFeedStory(story, page.fan_info, trackInfos);
			})
		};
	}

	parseFanFeedStory(
		story: PrivBandcampFanFeed$Story,
		fanInfos: {[fanId: string]: PrivBandcampFanFeed$Fan},
		trackInfos: {[trackId: string]: PrivBandcampFanFeed$Track}
	): BandcampFanFeed$Story {
		let item: (BandcampFanFeed$Album | BandcampFanFeed$Track | undefined) = undefined;
		let images: BandcampImage[] = [];
		if(story.item_art?.url) {
			images.push({
				url: story.item_art.url,
				size: BandcampImageSize.Medium,
			});
		}
		if(story.item_art?.thumb_url) {
			images.push({
				url: story.item_art.thumb_url,
				size: BandcampImageSize.Small,
			});
		}
		if(story.item_type == BandcampItemTypeChar.Album || story.item_type == BandcampItemType.Album) {
			const trackId = story.featured_track;
			const track = trackId != null ? trackInfos[trackId] : null;
			item = {
				id: story.item_id,
				type: BandcampItemType.Album,
				url: story.item_url,
				name: story.item_title,
				artistName: story.band_name,
				artistURL: story.band_url,
				images,
				featuredTrack: track ? {
					id: trackId,
					name: track.title,
					type: BandcampItemType.Track,
					url: story.featured_track_url ?? undefined,
					trackNumber: story.featured_track_number ?? track.track_num,
					audioSources: track.streaming_url ? this.parseAudioSourcesFromURLMap(track.streaming_url) : undefined,
				} : undefined,
			} satisfies BandcampFanFeed$Album;
		}
		else if(story.item_type == BandcampItemTypeChar.Track || story.item_type == BandcampItemType.Track) {
			const trackId = story.item_id;
			const track = trackId != null ? trackInfos[trackId] : null;
			item = {
				id: trackId,
				type: BandcampItemType.Track,
				url: story.item_url,
				name: story.item_title,
				artistName: story.band_name,
				artistURL: story.band_url,
				images,
				audioSources: track?.streaming_url ? this.parseAudioSourcesFromURLMap(track.streaming_url) : undefined,
			} satisfies BandcampFanFeed$Track;
		}
		return {
			date: story.story_date,
			type: story.story_type as BandcampFanFeed$StoryType,
			why: story.why,
			fan: this.parseFanFeedFan(story, fanInfos),
			item,
		};
	}

	parseFanFeedFan(
		story: PrivBandcampFanFeed$Story,
		fanInfos: {[fanId: string]: PrivBandcampFanFeed$Fan}
	): BandcampFanFeed$Fan {
		const fanId = story.fan_id;
		const fan = fanInfos[fanId];
		const imageId = this.padImageId(fan.image_id);
		const images = this.createImagesFromImageId(imageId);
		return {
			id: fanId,
			type: BandcampItemType.Fan,
			url: fan.trackpipe_url,
			name: fan.name,
			username: fan.username,
			images
		};
	}


	parseAudioSourcesFromURLMap(urls: {[type: string]: string}): BandcampAudioSource[] {
		const audioSources: BandcampAudioSource[] = [];
		for(const type in urls) {
			audioSources.push({
				type,
				url: urls[type],
			});
		}
		return audioSources;
	}

	parseReferrerToken($: cheerio.CheerioAPI): string | undefined {
		let referrerToken = $('script[data-referrer-token]').attr('data-referrer-token')?.trim();
		if(referrerToken && referrerToken.startsWith('"')) {
			referrerToken = referrerToken.substring(1);
		}
		if(referrerToken && referrerToken.endsWith('"')) {
			referrerToken = referrerToken.substring(0, referrerToken.length - 1);
		}
		return referrerToken;
	}

	parsePageData($: cheerio.CheerioAPI): any | null | undefined {
		const pageData = $('#pagedata').attr('data-blob');
		if(!pageData) {
			return null;
		}
		return JSON.parse(pageData);
	}

	parseCrumbs($: cheerio.CheerioAPI): {[key: string]: string} | null {
		const crumbData = $('#js-crumbs-data').attr('data-crumbs');
		if(!crumbData) {
			return null;
		}
		return JSON.parse(crumbData);
	}
}
