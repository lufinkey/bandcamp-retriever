
const BandcampSession = require('./Session');

class BandcampAuth {
	constructor(options) {
		if(options.sessionCookies && options.sessionCookies.length > 0) {
			this._session = new BandcampSession(options.sessionCookies);
		}
	}

	get isLoggedIn() {
		if(this._session && this._session.isLoggedIn) {
			return true;
		}
		return false;
	}

	get session() {
		return this._session;
	}

	getSameSiteRequestHeaders(url) {
		if(this._session == null) {
			return {};
		}
		return {
			'Cookie': this._session.getURLCookies(url).map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	getCrossSiteRequestHeaders(url) {
		if(this._session == null) {
			return {};
		}
		return {
			'Cookie': this._session.getURLCookies(url, {
					sameSiteContext: 'none'
				}).map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	loginWithCookies(sessionCookies) {
		const session = new BandcampSession(sessionCookies);
		return this.loginWithSession(session);
	}

	loginWithSession(session) {
		if(session.isLoggedIn) {
			this._session = session;
			return true;
		}
		return false;
	}

	updateSessionCookies(sessionCookies) {
		if(this._session) {
			this._session.updateCookies(sessionCookies);
		} else if(sessionCookies.length > 0) {
			this._session = new BandcampSession(sessionCookies);
		}
	}

	logout() {
		this._session = null;
	}
}

module.exports = BandcampAuth;
