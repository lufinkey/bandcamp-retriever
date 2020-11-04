
const BandcampParser = require('./Parser');
const QueryString = require('querystring');
const UrlUtils = require('url');
const { sendHttpRequest } = require('./Utils');


class Bandcamp {
	constructor() {
		this._parser = new BandcampParser();
	}

	slugify(str) {
		return this._parser.slugify(str);
	}

	async search(query, options={}) {
		// create and send request
		const params = {
			...options,
			q: query
		};
		const url = "https://bandcamp.com/search?"+QueryString.stringify(params);
		const { res, data } = await sendHttpRequest(url, {headers:options.headers});
		if(!data) {
			throw new Error("Unable to get data from search url");
		}
		// parse result
		const searchResults = this._parser.parseSearchResultsData(url, data);
		return this._parser.createFetchResult(res, searchResults);
	}

	async getItemFromURL(url, options={}) {
		if(!options.type) {
			options.type = this._parser.parseType(url);
		}
		const { res, data } = await sendHttpRequest(url, {headers:options.headers});
		if(!data) {
			throw new Error("Unable to get data from url");
		}
		const result = this._parser.parseItemDataFromURL(url, options.type, data);
		return this._parser.createFetchResult(res, result);
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
