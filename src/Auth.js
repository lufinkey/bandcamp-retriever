
const tough = require('tough-cookie');
const BandcampSession = require('./Session');

class BandcampAuth {
	constructor(options) {
		if(options.sessionCookies) {
			const session = new BandcampSession(options.sessionCookies);
			if(session.isLoggedIn) {
				this._session = session;
			}
		}
	}

	get isLoggedIn() {
		if(this._session && this._session.isLoggedIn) {
			return true;
		}
		return false;
	}

	loginWithCookies(sessionCookies) {
		const session = new BandcampSession(sessionCookies);
		if(session.isLoggedIn) {
			this._session = session;
		}
		return this.isLoggedIn;
	}

	updateSessionCookies(sessionCookies) {
		if(this._session) {
			this._session.updateSessionCookies(sessionCookies);
		} else {
			const session = new BandcampSession(sessionCookies);
			if(session.isLoggedIn) {
				this._session = session;
			}
		}
	}

	logout() {
		this._session = null;
	}
}

module.exports = BandcampAuth;
