
import tough from 'tough-cookie';

export const BANDCAMP_COOKIES_URL = "https://bandcamp.com/"

export const COOKIE_NAME_CLIENT_ID = "client_id";
export const COOKIE_NAME_IDENTITY = "identity";
export const COOKIE_NAME_SESSION = "session";


type GetCookiesOptions = tough.CookieJar.GetCookiesOptions & {
	// this property is in the tough-cookie docs, but missing from the actual type
	sameSiteContext: 'none' | 'lax' | 'strict'
}

export default class BandcampSession {
	_cookieStore: tough.CookieJar

	constructor(cookies?: (tough.Store | (tough.Cookie | string)[] | undefined)) {
		if(cookies instanceof tough.Store) {
			this._cookieStore = new tough.CookieJar(cookies);
		} else {
			this._cookieStore = new tough.CookieJar();
			if(cookies) {
				for(const cookie of cookies) {
					this._cookieStore.setCookieSync(cookie, BANDCAMP_COOKIES_URL);
				}
			}
		}
	}

	getBandcampCookiesSync(): tough.Cookie[] {
		return this.getURLCookiesSync(BANDCAMP_COOKIES_URL);
	}
	
	getURLCookiesSync(url: string, options?: GetCookiesOptions): tough.Cookie[] {
		if(options) {
			return this._cookieStore.getCookiesSync(url, options);
		} else {
			return this._cookieStore.getCookiesSync(url);
		}
	}

	getCookie(cookieName: string) {
		return findCookie(this.getBandcampCookiesSync(), cookieName);
	}

	get clientIdCookie(): tough.Cookie | null {
		return this.getCookie(COOKIE_NAME_CLIENT_ID);
	}

	get identityCookie(): tough.Cookie | null {
		return this.getCookie(COOKIE_NAME_IDENTITY);
	}

	get sessionCookie(): tough.Cookie | null {
		return this.getCookie(COOKIE_NAME_SESSION);
	}

	get isLoggedIn(): boolean {
		const cookies = this.getBandcampCookiesSync();
		if(findCookie(cookies, COOKIE_NAME_CLIENT_ID) && findCookie(cookies, COOKIE_NAME_IDENTITY)) {
			return true;
		}
		return false;
	}

	removeAllCookiesSync() {
		this._cookieStore.removeAllCookiesSync();
	}

	getSameSiteRequestHeaders(url: string): {[key: string]: string} {
		return {
			'Cookie': this.getURLCookiesSync(url).map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	getCrossSiteRequestHeaders(url: string): {[key: string]: string} {
		return {
			'Cookie': this.getURLCookiesSync(url, {
					sameSiteContext: 'none'
				}).map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	updateCookies(cookies: (string | tough.Cookie)[]) {
		for(const cookie of cookies) {
			this._cookieStore.setCookieSync(cookie, BANDCAMP_COOKIES_URL);
		}
	}

	serialize(): string {
		const cookies = this.getBandcampCookiesSync();
		const clientIdCookie = findCookie(cookies, COOKIE_NAME_CLIENT_ID);
		const identityCookie = findCookie(cookies, COOKIE_NAME_IDENTITY);
		return JSON.stringify({
			clientId: (clientIdCookie != null) ? clientIdCookie.value : null,
			identity: (identityCookie != null) ? identityCookie.value : null,
			cookies: cookies.map((cookie) => {
				return cookie.toString()
			})
		});
	}
}



const findCookie = (cookies: tough.Cookie[], cookieName: string): tough.Cookie | null => {
	return cookies.find((cookie) => {
		if(cookie.key === cookieName) {
			return true;
		}
		return false;
	}) ?? null;
}
