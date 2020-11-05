
const tough = require('tough-cookie');

const BANDCAMP_COOKIES_URL = "https://bandcamp.com/"
const COOKIE_NAME_CLIENT_ID = "client_id";
const COOKIE_NAME_IDENTITY = "identity";
const COOKIE_NAME_SESSION = "session";



class BandcampSession {
	constructor(cookies) {
		this._cookieStore = new tough.CookieJar();
		if(cookies) {
			for(const cookie of cookies) {
				this._cookieStore.setCookieSync(cookie, BANDCAMP_COOKIES_URL);
			}
		}
	}

	get cookies() {
		return this._cookieStore.getCookiesSync(BANDCAMP_COOKIES_URL);
	}

	getURLCookies(url, options) {
		return this._cookieStore.getCookiesSync(url, options);
	}

	getCookie(cookieName) {
		return findCookie(this.cookies, cookieName);
	}

	get clientIdCookie() {
		return this.getCookie(COOKIE_NAME_CLIENT_ID);
	}

	get identityCookie() {
		return this.getCookie(COOKIE_NAME_IDENTITY);
	}

	get sessionCookie() {
		return this.getCookie(COOKIE_NAME_SESSION);
	}

	get isLoggedIn() {
		const cookies = this.cookies;
		if(findCookie(cookies, COOKIE_NAME_CLIENT_ID) && findCookie(cookies, COOKIE_NAME_IDENTITY)) {
			return true;
		}
		return false;
	}

	updateCookies(cookieStrings) {
		for(const cookieString of cookieStrings) {
			this._cookieStore.setCookieSync(cookieString, BANDCAMP_COOKIES_URL);
		}
	}
}



const findCookie = (cookies, cookieName) => {
	return cookies.find((cookie) => {
		if(cookie.key === cookieName) {
			return true;
		}
		return false;
	});
}


module.exports = BandcampSession;
