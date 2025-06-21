import type {
	PrivBandcampAudioFileType,
	PrivBandcampIdentities
} from './common'

export type PrivBandcampFanFeed$PageData = {
	recaptcha_public_key: string
	invisible_recaptcha_public_key: string
	localize_page: boolean
	locale: string
	languages: {
		[lang: ('en' | string)]: string // 2 letter lang code. "en", "de", etc
	}
	help_center_url: string
	cfg: {
		menubar_autocomplete_enabled: boolean
		use_elasticsearch_backed_search: boolean
		new_search_api_service: boolean
		search_tracking: boolean
		single_sign_up: boolean
		fan_signup_use_captcha: boolean
		gift_cards: boolean
		order_history: boolean
		header_rework_2018: boolean
		search_discovery_one_filter_desktop_only: boolean
		search_discovery_one_filter_rollout: boolean
		community: boolean
		login_use_captcha: boolean
		open_signup: boolean
		stream_buffer_duration_stats: boolean
	}
	identities: PrivBandcampIdentities
	signup_params: {}
	fan_onboarding: {
		tooltips: unknown
		num_tooltips: number
		tooltip_number: unknown
		current_index: unknown
		complete: boolean
		show_collection_banner: boolean
		show_feed_banner: boolean
		show_verify_banner: boolean
		first_wishlisted_item_title: unknown
		first_wishlisted_item_type: unknown
		first_purchased_item_title: unknown
		first_purchased_item_type: unknown
		template: unknown
		email: string
		has_collection: boolean
		has_seen_tooltips: boolean
		show_first_wishlist_tooltip: boolean
		deferred: unknown
	}
	feed: {
		dash_fan_id: number
		dash_fan_trackpipe_url: string
		generated_date: number
		oldest_story_date: number
		newest_story_date: number
		story_collectors: {
			[collectorId: string]: PrivBandcampFanFeed$StoryCollector
		}
		following_bands: {
			[bandId: string]: boolean
		}
		following_specs: {}
		fan_has_subscriptions: unknown
	}
	menubar: {
		any_pro: boolean
		fan_url: string
		has_wishlist: boolean
		has_collection: boolean
		gift_card_balance: unknown
		is_tralbum_page: boolean
		admin_level: number
		artist_service_active: boolean
		artist_subscriptions_enabled: boolean
		active_profile_photo: number
		cart_quantity: unknown
		discover_root: string
		page_path: string
		is_fan_page: boolean
		is_download_page: boolean
		show_crowdfunding_link: boolean
		show_add_live_show: boolean
		show_guide_link: boolean
	}
	fan_info: PrivBandcampFanFeed$CurrentFanInfo
	track_list: PrivBandcampFanFeed$Track[]
	item_lookup: {
		[itemId: string]: {
			item_type: ('a' | 't' | string)
			purchased: boolean
		}
	}
	show_newsletter_invite_banner: unknown
}

export type PrivBandcampFanFeed$Story = {
	fan_id: number
	item_id: number
	item_type: 'a' | 't' | string
	tralbum_id: number
	tralbum_type: string
	band_id: number
	why: string | null
	featured_track: number
	sale_item_id: number
	sale_item_type: string
	purchased: string // or consider using `Date` if you parse it
	added: string
	updated: string
	story_date: string
	story_type: string
	variant_id: number | null
	item_title: string
	item_url: string
	item_art_url: string
	item_art_id: number
	item_art: {
		url: string
		thumb_url: string
		art_id: number
	}
	item_art_ids: number[] | null
	releases: any | null // Placeholder, unknown structure
	discount: any | null // Placeholder, unknown structure
	url_hints: {
		subdomain: string
		custom_domain: string | null
		custom_domain_verified: boolean | null
		slug: string
		item_type: 'a' | 't' | string
	}
	band_name: string
	band_url: string
	genre_id: number
	is_purchasable: boolean
	currency: string
	is_set_price: boolean
	price: number
	merch_ids: number[]
	merch_sold_out: boolean
	label: string
	label_id: number
	is_private: boolean
	is_preorder: boolean
	is_giftable: boolean
	is_subscriber_only: boolean
	album_id: number
	album_title: string
	band_location: string | null
	band_image_id: number | null
	release_count: number | null
	message_count: number | null
	service_name: string | null
	service_url_fragment: string | null
	featured_track_is_custom: boolean
	featured_track_url: string | null
	featured_track_title: string
	featured_track_number: number
	featured_track_duration: number
	featured_track_encodings_id: number
	featured_track_license_id: number | null
	num_streamable_tracks: number
	download_available: boolean
	also_collected_count: number
	tags: PrivBandcampFanFeed$Story$Tag[]
	art_ids: number[]
}

export type PrivBandcampFanFeed$StoryCollector = {
	thumbs: PrivBandcampFanFeed$StoryCollector$Thumb[]
	reviews: PrivBandcampFanFeed$StoryCollector$Review[]
	more_thumbs_available: boolean
	more_reviews_available: boolean
	shown_reviews: PrivBandcampFanFeed$StoryCollector$Review[]
	shown_thumbs: PrivBandcampFanFeed$StoryCollector$Thumb[]
}

export type PrivBandcampFanFeed$StoryCollector$Thumb = {
	fan_id: number
	featured_track_id: number | null
	username: string
	name: string
	url: string
	why: string | null
	item_type: string
	item_id: number
	mod_date: string
	image_id: number
	is_montage_image: boolean
	token: string
	fav_track_title: string | null
}

export type PrivBandcampFanFeed$StoryCollector$Review = {
	fan_id: number
	featured_track_id: number
	username: string
	name: string
	url: string
	why: string
	item_type: string // You can narrow this down to specific literals like 'a' | 't' if applicable
	item_id: number
	mod_date: string // ISO 8601 or other date format as string
	image_id: number
	is_montage_image: boolean
	token: string
	fav_track_title: string
}

export type PrivBandcampFanFeed$Story$Tag = {
	name: string
	norm_name: string
	isloc: boolean
	loc_id: number | null
	geoname?: {
		id: number
		name: string
		fullname: string
	}
}

export interface PrivBandcampFanFeed$CurrentFanInfo {
	fan_id: number
	enabled: boolean
	verified: boolean
	private: boolean
	disabled_date: unknown
	create_date: string
	name: string
	username: string
	email: string
	paypal_emails: string[]
	location: unknown
	website_url: string
	photo: {
		image_id: number
		width: number
		height: number
	}
	bio: string
	trackpipe_url: string
	trackpipe_url_https: string
	header_image_id: unknown
	banner_id: unknown
	banner_image_id: unknown
	banner_mobile_image_id: unknown
	custom_banner_image_id: unknown
	custom_banner_align: unknown
	wishlist_private: boolean
	download_encoding: number
	banner_align: unknown
	banner_url: unknown
	is_custom_banner: boolean
	fav_genre_id: number
	fav_genre_name: string
	has_subscriptions: unknown
	payment_type: string
	locale: string
}

export type PrivBandcampFanFeed$Track = {
	track_id: number
	title: string
	duration?: number
	track_num?: number
	album_title?: string
	band_name?: string
	streaming_url?: {
		// map of file types to URLs
		[key: (PrivBandcampAudioFileType | string)]: string
	}
	track_license_id?: number | null
	encodings_id?: number
	art_id?: number
	album_id?: number
	is_streamable?: boolean
	has_lyrics?: boolean | null
	is_set_price?: boolean
	price?: number | string
	has_digital_download?: boolean | null
	merch_ids?: number[]
	merch_sold_out?: boolean
	currency?: string
	require_email?: boolean | null
	is_purchasable?: boolean
	band_id?: number
	label?: string
	label_id?: number
}

export type PrivBandcampFanFeed$Fan = {
	fan_id: number
	name: string
	username: string
	fav_genre_id: number
	bio: string
	image_id: number
	is_montage_image: number // assuming 0 or 1, you can use `boolean` if preferred
	followed: number // same as above, could be `boolean`
	collection_size: number
	fav_genre_name: string
	trackpipe_url: string
	num_items_in_common: number
	followed_by: {
		fan_id: number
		username: string
		name: string
	}[]
	location: string
	collection_art: {
		tralbum_id: number
		tralbum_type: "a" | "t" // assuming only "a" (album) and "t" (track) are valid
		art_info: {
			art_id: number
		}
	}[]
}

export type PrivBandcampFanFeed$Band = {
	band_id: number
	name: string
	image_id: number
	genre_id: number | null
	latest_art_id: number | null
	no_index: null
	followed: 0 | 1
}



// FAN FEED STORIES VM

export type PrivBandcampFanFeed$StoriesVM = {
	stories: PrivBandcampFanFeed$Story[]
	fan_info: {
		[fanId: string]: PrivBandcampFanFeed$Fan
	}
	band_info: {
		[bandId: string]: PrivBandcampFanFeed$Band
	}
	story_collectors: {
		[collectorId: string]: PrivBandcampFanFeed$StoryCollector
	}
	item_lookup: {
		[itemId: string]: {
			item_type: ('a' | 't' | string)
			purchased: boolean
		}
	}
	track_list: PrivBandcampFanFeed$Track[]
}

export type PrivBandcampFanFeedPage = {
	pageData: PrivBandcampFanFeed$PageData
	storiesVM: PrivBandcampFanFeed$StoriesVM
}
