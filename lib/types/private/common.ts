
export enum PrivBandcampLangShort {
	EN = 'en',
	DE = 'de',
	ES = 'es',
	FR = 'fr',
	PT = 'pt',
	JA = 'ja',
}

export enum PrivBandcampCountryCode {
	US = 'US',
}

export enum PrivBandcampCurrencyCode {
	USD = 'USD',
	AUD = 'AUD',
	GBP = 'GBP',
	CAD = 'CAD',
	CZK = 'CZK',
	DKK = 'DKK',
	EUR = 'EUR',
	HKD = 'HKD',
	HUF = 'HUF',
	ILS = 'ILS',
	JPY = 'JPY',
}

export type PrivBandcampCurrencyData = {
	symbol: string | PrivBandcampCurrencyCode,
	long: string // "US Dollar"
	plural: string // "US Dollars"
	prefix_utf8: string // "$"
	prefix: string // "$"
	prefix_informal_utf8: string // "$"
	prefix_informal: string // "$"
	suffix_informal: string, // ""
	places: number // 2,
	a_dollar: number, // 1
	small_min_price: number, // 0.5
	medium_min_price: number, // 1
	fixed_rate: number, // 1
	slang?: [string], // "bucks", "bones", "clams", "smackers"
	paypal: boolean,
	payflow: boolean
}

export enum PrivBandcampAudioFileType {
	mp3_v0 = 'mp3-v0',
	mp3_128 = 'mp3-128',
	mp3_320 = 'mp3-320',
	flac = 'flac',
	aac_hi = 'aac-hi',
	aiff_lossless = 'aiff-lossless',
	vorbis = 'vorbis',
	alac = 'alac',
	wav = 'wav',
}

export enum PrivBandcampPlatform {
	Win = 'win',
}

export type PrivBandcampIdentities = {
	user: {
		id: number
	},
	ip_country_code: PrivBandcampCountryCode | string,
	fan: {
		id: number,
		username: string,
		name: string,
		photo: number,
		private: boolean,
		verified: boolean,
		url: string
	},
	is_page_band_member: null | any,
	subscribed_to_page_band: null | any,
	bands: [],
	partner: boolean,
	is_admin: boolean,
	labels: []
}
