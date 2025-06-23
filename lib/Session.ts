
import * as tough from 'tough-cookie';

export const BANDCAMP_COOKIES_URL = "https://bandcamp.com/"

export enum CookieName {
	PlaylimitClientID = 'playlimit_client_id',
	CartClientID = 'cart_client_id',
	Identity = 'identity',
}

type GetCookiesOptions = tough.GetCookiesOptions & {
	// this property is in the tough-cookie docs, but missing from the actual type
	sameSiteContext: 'none' | 'lax' | 'strict'
}

export class BandcampSession {
	_cookieStore: tough.CookieJar

	constructor(cookies?: (tough.Store | (tough.Cookie | string)[] | undefined)) {
		if(cookies instanceof tough.Store) {
			this._cookieStore = new tough.CookieJar(cookies);
		} else {
			this._cookieStore = new tough.CookieJar();
			if(cookies) {
				for(const cookie of cookies) {
					this._cookieStore.setCookie(cookie, BANDCAMP_COOKIES_URL).catch((error) => {
						console.error(error);
					});
				}
			}
		}
	}

	async getBandcampCookies(): Promise<tough.Cookie[]> {
		return await this.getURLCookies(BANDCAMP_COOKIES_URL);
	}
	
	async getURLCookies(url: string, options?: GetCookiesOptions): Promise<tough.Cookie[]> {
		if(options) {
			return await this._cookieStore.getCookies(url, options);
		} else {
			return await this._cookieStore.getCookies(url);
		}
	}

	async getCookie(cookieName: string): Promise<tough.Cookie | null> {
		const cookies = await this.getBandcampCookies();
		return await findCookie(cookies, cookieName);
	}

	getPlaylimitClientIdCookie(): Promise<tough.Cookie | null> {
		return this.getCookie(CookieName.PlaylimitClientID);
	}

	getCartClientIdCookie(): Promise<tough.Cookie | null> {
		return this.getCookie(CookieName.CartClientID);
	}

	getIdentityCookie(): Promise<tough.Cookie | null> {
		return this.getCookie(CookieName.Identity);
	}

	async getLoggedInStatus(): Promise<boolean> {
		const cookies = await this.getBandcampCookies();
		if(findCookie(cookies, CookieName.PlaylimitClientID) && findCookie(cookies, CookieName.Identity)) {
			return true;
		}
		return false;
	}

	async removeAllCookies() {
		await this._cookieStore.removeAllCookies();
	}

	static requestHeadersFromCookies(cookies: tough.Cookie[]): {[key: string]: string} {
		return {
			'Cookie': cookies.map((cookie) => {
					return cookie.cookieString();
				}).join('; ')
		};
	}

	async getSameSiteRequestHeaders(url: string): Promise<{[key: string]: string}> {
		const cookies = await this.getURLCookies(url);
		return BandcampSession.requestHeadersFromCookies(cookies);
	}

	async getCrossSiteRequestHeaders(url: string): Promise<{[key: string]: string}> {
		const cookies = await this.getURLCookies(url, {
			sameSiteContext: 'none'
		});
		return BandcampSession.requestHeadersFromCookies(cookies);
	}

	async updateBandcampCookies(cookies: (string | tough.Cookie)[]) {
		let firstError: Error | undefined = undefined;
		await Promise.all(cookies.map((cookie) => (this._cookieStore.setCookie(cookie, BANDCAMP_COOKIES_URL))));
		if(firstError !== undefined) {
			throw firstError;
		}
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
