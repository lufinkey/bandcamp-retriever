
export type PrivBandcampLangShort = 'en' | 'de' | 'es' | 'fr' | 'pt' | 'ja';
export type PrivBandcampCountryCode = 'US';

export type PrivBandcampCurrencyCode = 'USD' | 'AUD' | 'GBP' | 'CAD' | 'CZK' | 'DKK' | 'EUR' | 'HKD' | 'HUF' | 'ILS' | 'JPY';

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
};

export type PrivBandcampFileType = 'mp3-128' | 'mp3-v0';

export type PrivBandcampPlatform = 'win';



// FAN PAGE DATA TYPES

export type PrivBandcampFan$FanData = {
	trackpipe_url: string, // "https://bandcamp.com/<USERNAME>",
	username: string,
	name: string,
	fan_id: number,
	location: null | any,
	raw_location: null | any,
	bio: string,
	photo: {
		image_id: number,
		width: number,
		height: number
	},
	website_url: string,
	is_own_page: boolean,
	followers_count: number,
	following_bands_count: number,
	following_fans_count: number,
	following_genres_count: number,
	subscriptions_count: number,
	fav_genre: string
};

export type PrivBandcampFan$AlbumTrack = {
	id: number,
	title: string,
	artist: string,
	track_number: number,
	duration: number,
	file: { // map of file types to URLs
		[filetype: (PrivBandcampFileType | string)]: string
	}
};

export type PrivBandcampFan$CollectionBatchData = {
	last_token: string, //"<entrysecondsfrom1970>:<itemid>:a:4:"
	item_count: number,
	batch_size: number,
	sequence: [string], // array of IDs
	pending_sequence: [string]
}

export type PrivBandcampFan$CollectionData = PrivBandcampFan$CollectionBatchData & {
	redownload_urls?: {
		[purchaseid: string]: string // "https://bandcamp.com/download?from=collection&payment_id=xxxxxxxxxx&sig=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&sitem_id=xxxxxxxx"
	},
	hidden_items_count: number,
	small_collection: boolean,
	small_wishlist: boolean,
	purchase_infos: {},
	collectors: {},
};

export type PrivBandcampFan$WishlistData = PrivBandcampFan$CollectionBatchData & {
	hidden: boolean
};

export type PrivBandcampFan$HiddenItemsData = PrivBandcampFan$CollectionBatchData & {
	last_token_is_gift_given: null | any,
};

export type PrivBandcampFan$CollectionItemInfo = {
	item_id: number,
	item_type: 'album' | 'track' | string,
	tralbum_id: number,
	tralbum_type: 'a' | 't' | string,
	album_id: number,
	item_title: string,
	band_id: number,
	band_name: string,
	featured_track: number,
	featured_track_title: string,
	featured_track_url: null,
	featured_track_is_custom: boolean,
	also_collected_count: number,
	why: null | any,
	url_hints: {
		subdomain: string,
		custom_domain: null | string,
		custom_domain_verified: null | string,
		slug: string,
		item_type: 'a' | 't' | string
	},
	item_art_id: number,
	item_url: string,
	package_details: null,
	num_streamable_tracks: number,
	is_purchasable: boolean,
	is_private: boolean,
	is_preorder: boolean,
	is_giftable: boolean,
	is_subscriber_only: boolean,
	is_subscription_item: boolean,
	hidden: null | any,
	gift_sender_name: null,
	gift_sender_note: null,
	gift_id: null | number,
	gift_recipient_name: null | string,
	sale_item_id: null | number,
	sale_item_type: null | 'p' | string,
	band_image_id: null | number,
	band_location: null | any,
	release_count: null | number,
	message_count: null | number,
	service_name: null | string,
	service_url_fragment: null | string,
	download_available: boolean,
	purchased: null | string // "01 Jan 2020 12:00:00 GMT"
};

export type PrivBandcampFan$FollowerInfo = {
	fan_id: number,
	band_id: null | number,
	fan_url: null | string,
	image_id: string | number,
	trackpipe_url: null | string,
	name: string,
	is_following: boolean,
	location: string,
	date_followed: string, // "01 Jan 2020 12:00:00 GMT"
	token: string, // "<followdatesecondsfrom1970>:<itemid>"
};

export type PrivBandcampFan$FollowingBandInfo = {
	band_id: number,
	image_id: number,
	art_id: number,
	url_hints: {
		subdomain: string,
		custom_domain: null | string
	},
	name: string,
	is_following: boolean,
	is_subscribed: null | boolean,
	location: string,
	date_followed: string, // "01 Jan 2020 12:00:00 GMT"
	token: string // "<followdatesecondsfrom1970>:<itemid>"
};

export type PrivBandcampFan$FollowingFanInfo = {
	fan_id: number,
	band_id: null | number,
	fan_url: null | string,
	image_id: number,
	trackpipe_url: null | string,
	name: string,
	is_following: boolean,
	location: string,
	date_followed: string // "01 Jan 2020 12:00:00 GMT",
	token: string // "<followdatesecondsfrom1970>:<itemid>"
};

export type PrivBandcampFan$BannerChoice = {
	banner_id: number,
	banner_url: string,
	banner_image_id: number,
	mobile_image_id: number,
	name: string,
	alignment: number
};

export type PrivBandcampFan$Genre = {
	id: number,
	name: string, // "electronic"
	norm_name: string // "electronic"
	value: string // "electronic"
};

export type PrivBandcampFan$SubGenre = {
	name: string, // "folk"
	value: string, // "folk"
	norm_name: string // "folk"
};

export type PrivBandcampFanPageData = {
	recaptcha_public_key: string,
	invisible_recaptcha_public_key: string,
	localize_page: boolean,
	locale: PrivBandcampLangShort,
	languages: { [lang: (string | PrivBandcampLangShort)]: string },
	help_center_url: string, // "https://get.bandcamp.help/hc/en-us",
	templglobals: {
		endpoint_mobilized: boolean,
		is_phone: boolean
	},
	image_editor_enabled: boolean,
	signup_querystrings: {
		[itemid: string]: string
		// "<albumid>": ?action_sig=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&action_url=https%3A%2F%2Fbandcamp.com%2F<USERNAME>%2F&band_id=xxxxxxxxxx&item_id=xxxxxxxxxx&item_type=a",
		// "<fanid>": "?action_sig=xxxxxxxxxxxxxxxxxxxxxxxxxxxxx&action_url=https%3A%2F%2Fbandcamp.com%2F<USERNAME>%2F&band_id=0&item_id=xxxxxx&item_type=f"
	},
	cfg: {
		menubar_autocomplete_enabled: boolean,
		use_elasticsearch_backed_search: boolean,
		new_search_api_service: boolean,
		search_tracking: boolean,
		single_sign_up: boolean,
		fan_signup_use_captcha: boolean,
		gift_cards: boolean,
		order_history: boolean,
		header_rework_2018: boolean,
		search_discovery_one_filter_desktop_only: boolean,
		search_discovery_one_filter_rollout: boolean,
		community: boolean,
		login_use_captcha: boolean,
		gifting: boolean,
		artist_subscriptions: boolean,
		open_signup: boolean,
		fan_page_2017: boolean,
		genre_management: boolean,
		mobile_download_fix: boolean,
		mobile_onboarding: boolean,
		fan_collection_also_collected_expand: boolean,
		fan_collection_also_collected_counts: boolean
	},
	identities: {
		// related to the current user's identities, not necessarily the fan from the page
		user: {
			id: number
		},
		ip_country_code: string | PrivBandcampCountryCode,
		fan: {
			id: number,
			username: string,
			name: string,
			photo: number, // image identifier
			private: boolean,
			verified: boolean,
			url: string // "https://bandcamp.com/<USERNAME>"
		},
		is_page_band_member: null | any,
		subscribed_to_page_band: null | any,
		bands: [any],
		partner: boolean,
		is_admin: boolean,
		labels: [any]
	},
	signup_params: {} | any,
	fan_onboarding: {
		tooltips: null | any,
		num_tooltips: number, // count
		tooltip_number: null | undefined | number,
		current_index: null | undefined | number,
		complete: boolean,
		show_collection_banner: boolean,
		show_feed_banner: boolean,
		show_verify_banner: boolean,
		first_wishlisted_item_title: null | any,
		first_wishlisted_item_type: null | any,
		first_purchased_item_title: null | any,
		first_purchased_item_type: null | any,
		template: null | any,
		email: string //"xxxxxxx@yyyy.com",
		has_collection: boolean,
		has_seen_tooltips: boolean,
		show_first_wishlist_tooltip: boolean,
		deferred: null | any
	},
	utc_for_new_banner: string; // "01 Jan 2024 12:00:00 GMT",
	social_prefs: {
		fb_is_connected: boolean,
		tw_is_connected: boolean
	},
	media_mode_test: boolean,
	currency_data: {
		info: {
			[currencycode: (string | PrivBandcampCurrencyCode)]: PrivBandcampCurrencyData
		},
		list: [(string | PrivBandcampCurrencyCode)],
		rates: {
			[currencycode: (string | PrivBandcampCurrencyCode)]: number
		},
		setting: null | any,
		current: null | any
	},
	fan_read_only: boolean,
	from_fansuggest: null | any,
	fan_stats: {
		fan_id: number,
		other_visits: number,
		other_plays: number,
		other_wishlists: number,
		other_purchases: number,
		fansuggest_welcome: number,
		fansuggest_activity: number,
		fansuggest_sidebar: number,
		fansuggest_followed: number,
		fansuggest_feed: number,
		fansuggest_collection: number,
		fan_edit_photo: number,
		photo_facebook: number,
		photo_twitter: number,
		photo_upload: number,
		views_desktop: number,
		views_mobile: number
	},
	tracklists: {
		collection?: {
			[albumID: string]: [PrivBandcampFan$AlbumTrack],
		},
		gifts_given?: {},
		hidden?: {
			[albumID: string]: [PrivBandcampFan$AlbumTrack],
		}
		wishlist?: {
			[albumID: string]: [PrivBandcampFan$AlbumTrack],
		}
	},
	platform: PrivBandcampPlatform,
	active_tab: string | 'collection' | 'wishlist' | 'followers' | 'following',
	mobile_app_compatible: boolean,
	platform_app_url: null | string,
	mobile_app_url: string, // "https://bandcamp.com/redirect_to_app?fallback_url=https%3A%2F%2Fbandcamp.com%2Fthis_is_an_appstore_url%3Fapp%3Dfan_app&url=x-bandcamp%3A%2F%2Fopen&sig=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
	fan_data: PrivBandcampFan$FanData,
	current_fan: {
		fan_id: number,
		username: string,
		item_lookup: {
			[itemid: string]: {
				item_type: 'a' | 't' | string,
				purchased: boolean
			},
		},
		trackpipe_url: string, // "http://bandcamp.com/<USERNAME>",
		collection_count: number,
		is_following: boolean,
		is_following_any: null | any,
		is_own_collection: boolean,
		subscriptions_count: number
	},
	collection_data: PrivBandcampFan$CollectionData,
	wishlist_data: PrivBandcampFan$WishlistData
	hidden_data: PrivBandcampFan$HiddenItemsData,
	gifts_given_data: PrivBandcampFan$CollectionBatchData & {
		visible_count: number,
		hidden_count: number,
		similar: {}
	},
	followers_data: PrivBandcampFan$CollectionBatchData,
	following_bands_data: PrivBandcampFan$CollectionBatchData,
	following_fans_data: PrivBandcampFan$CollectionBatchData,
	following_genres_data: PrivBandcampFan$CollectionBatchData & {
		hidden: boolean
	},
	embed_data: {
		linkback: string // "http://bandcamp.com/<USERNAME>"
	},
	item_cache: {
		collection: {
			[itemid: string]: PrivBandcampFan$CollectionItemInfo
		},
		wishlist: {
			[itemid: string]: PrivBandcampFan$CollectionItemInfo
		},
		gifts_given: {
			[itemid: string]: PrivBandcampFan$CollectionItemInfo
		},
		hidden: {
			[itemid: string]: PrivBandcampFan$CollectionItemInfo
		},
		followers: {
			[entityid: string]: PrivBandcampFan$FollowerInfo
		},
		following_bands: {
			[bandid: string]: PrivBandcampFan$FollowingBandInfo,
		},
		following_fans: {
			[fanid: string]: PrivBandcampFan$FollowingFanInfo
		},
		following_genres: {},
		fan_suggestions: {}
	},
	fan_suggestions_data: {
		item_count: number,
		sequence: [string],
		pending_sequence: [string]
	},
	banner_data: {
		banner_choices: [PrivBandcampFan$BannerChoice],
		banner_url: null | string,
		banner_align: null | any,
		banner_id: null | any,
		banner_image_id: null | number,
		custom_banner_image_id: null | number,
		custom_banner_url: string, // "https://f4.bcbits.com/img/blank.gif",
		custom_banner_align: null | any,
		custom_banner_image_hash: null | string,
		is_custom_banner: boolean
	},
	MAX_NAME_LENGTH: number, // 100,
	MAX_BIO_LENGTH: number // 400,
	MAX_WEBSITE_URL_LENGTH: number, // 60,
	MAX_WHY_LENGTH: number, // 500,
	REVIEW_OR_FAVTRACK_FOUND: boolean,
	collection_count: number,
	genre_picker: {
		genres: [PrivBandcampFan$Genre],
		subgenres: {
			[genre: string]: [PrivBandcampFan$SubGenre],
		}
	},
	show_newsletter_invite_banner: null
};

export type PrivBandcampAPI$Fan$CollectionSummary$TRAlbumLookup = {
	[albumid: string]: {
		item_type: 'a' | 't' | string,
		item_id: number,
		band_id: number,
		purchased: string | null // "01 Jan 2020 12:00:00 GMT"
	},
};

export type PrivBandcampAPI$Fan$CollectionSummary = {
	fan_id: number,
	collection_summary: {
		fan_id: number,
		username: string,
		url: string, // "https://bandcamp.com/lufinkey"
		tralbum_lookup: PrivBandcampAPI$Fan$CollectionSummary$TRAlbumLookup,
		follows: {
			following: {
				[id: string]: boolean
			}
		}
	}
};
