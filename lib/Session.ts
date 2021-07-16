
import tough from 'tough-cookie';

const BANDCAMP_COOKIES_URL = "https://bandcamp.com/"
const COOKIE_NAME_CLIENT_ID = "client_id";
const COOKIE_NAME_IDENTITY = "identity";
const COOKIE_NAME_SESSION = "session";


type GetCookiesOptions = tough.CookieJar.GetCookiesOptions & {
	sameSiteContext: 'none' | 'lax' | 'strict'
}

export default class BandcampSession {
	_cookieStore: tough.CookieJar

	constructor(cookies: (tough.Cookie | string)[]) {
		this._cookieStore = new tough.CookieJar();
		if(cookies) {
			for(const cookie of cookies) {
				this._cookieStore.setCookieSync(cookie, BANDCAMP_COOKIES_URL);
			}
		}
	}
	
	get cookies(): tough.Cookie[] {
		return this.getURLCookies(BANDCAMP_COOKIES_URL);
	}

	getURLCookies(url: string, options?: GetCookiesOptions): tough.Cookie[] {
		if(options) {
			return this._cookieStore.getCookiesSync(url, options);
		} else {
			return this._cookieStore.getCookiesSync(url);
		}
	}

	getCookie(cookieName: string) {
		return findCookie(this.cookies, cookieName);
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
		const cookies = this.cookies;
		if(findCookie(cookies, COOKIE_NAME_CLIENT_ID) && findCookie(cookies, COOKIE_NAME_IDENTITY)) {
			return true;
		}
		return false;
	}

	updateCookies(cookies: (string | tough.Cookie)[]) {
		for(const cookie of cookies) {
			this._cookieStore.setCookieSync(cookie, BANDCAMP_COOKIES_URL);
		}
	}

	serialize(): string {
		const cookies = this.cookies;
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
