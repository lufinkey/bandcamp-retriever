
import BandcampSession from './Session';
import tough from 'tough-cookie';

export type BandcampAuthOptions = {
	sessionCookies?: (tough.Cookie | string)[]
}

export default class BandcampAuth {
	_session: BandcampSession | null

	constructor(options: BandcampAuthOptions) {
		if(options.sessionCookies && options.sessionCookies.length > 0) {
			this._session = new BandcampSession(options.sessionCookies);
		} else {
			this._session = null;
		}
	}

	get isLoggedIn(): boolean {
		if(this._session && this._session.isLoggedIn) {
			return true;
		}
		return false;
	}

	get session(): BandcampSession | null {
		return this._session;
	}

	getSameSiteRequestHeaders(url: string): {[key: string]: string} {
		if(this._session == null) {
			return {};
		}
		return {
			'Cookie': this._session.getURLCookies(url).map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	getCrossSiteRequestHeaders(url: string): {[key: string]: string} {
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

	loginWithCookies(sessionCookies: (string | tough.Cookie)[]) {
		const session = new BandcampSession(sessionCookies);
		return this.loginWithSession(session);
	}

	loginWithSession(session: BandcampSession) {
		if(session.isLoggedIn) {
			this._session = session;
			return true;
		}
		return false;
	}

	updateSessionCookies(sessionCookies: (string | tough.Cookie)[]) {
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
