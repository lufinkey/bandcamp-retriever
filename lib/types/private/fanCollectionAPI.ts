import type {
	PrivBandcampAudioFileType,
	PrivBandcampCurrencyCode
} from './common'

// FAN API COLLECTION ITEMS TYPES

export type PrivBandcampAPI$Fan$CollectionMediaItem = {
	fan_id: number,
	item_id: number,
	item_type: 'album' | 'track' | string,
	band_id: number,
	added: string, // "01 Jan 2020 12:00:00 GMT",
	updated: string, // "01 Jan 2020 12:00:00 GMT",
	purchased: string, // "01 Jan 2020 12:00:00 GMT",
	sale_item_id: number,
	sale_item_type: 'p' | string,
	tralbum_id: number,
	tralbum_type: 'a' | 't' | string,
	featured_track: number,
	why: string | null,
	hidden: null | any,
	index: null | any,
	also_collected_count: number,
	url_hints: {
		subdomain: string,
		custom_domain: string | null,
		custom_domain_verified: string | null,
		slug: string,
		item_type: 'a' | string
	},
	item_title: string,
	item_url: string,
	item_art_id: number,
	item_art_url: string,
	item_art: {
		url: string,
		thumb_url: string,
		art_id: number
	},
	band_name: string,
	band_url: string,
	genre_id: number,
	featured_track_title: string,
	featured_track_number: number,
	featured_track_is_custom: boolean,
	featured_track_duration: number, // duration in seconds
	featured_track_url: string | null,
	featured_track_encodings_id: number,
	package_details: {
		title: string,
		description: string,
		private: null | any,
		killed: null | any,
		band_id: number,
		label_id: number | null,
		is_subscriber_only: boolean,
		is_live_event: boolean,
		live_event_type: null | any,
		images: [
			{
				image_id: number,
				width: number,
				height: number
			}
		],
		band_name: string,
		url_hints: {
			subdomain: string,
			custom_domain: string | null,
			custom_domain_verified: string | null,
			slug: string,
			item_type: 'a' | string
		},
		item_url: string
	},
	num_streamable_tracks: number,
	is_purchasable: boolean,
	is_private: boolean,
	is_preorder: boolean,
	is_giftable: boolean,
	is_subscriber_only: boolean,
	is_subscription_item: boolean,
	service_name: string | null,
	service_url_fragment: null | any,
	gift_sender_name: string | null,
	gift_sender_note: string | null,
	gift_id: number | null,
	gift_recipient_name: string | null,
	album_id: number,
	album_title: string,
	listen_in_app_url: string, // "https://bandcamp.com/redirect_to_app?fallback_url=https%3A%2F%2Fbandcamp.com%2Fthis_is_an_appstore_url%3Fapp%3Dfan_app&url=x-bandcamp%3A%2F%2Fshow_tralbum%3Ftralbum_type%3Da%26tralbum_id%xxxxxxxxxxx%26play%3D1&sig=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
	band_location: null | any,
	band_image_id: number | null,
	release_count: number | null,
	message_count: number | null,
	is_set_price: boolean,
	price: number,
	has_digital_download: boolean | null,
	merch_ids: number[],
	merch_sold_out: boolean,
	currency: PrivBandcampCurrencyCode,
	label: string | null,
	label_id: number | null,
	require_email: boolean | null,
	item_art_ids: number[] | null,
	releases: null | any,
	discount: null | any,
	token: string, // xxxxxxxxxxx:xxxxxxxxxxxx:p::,
	variant_id: number | null,
	merch_snapshot: {
		package_type_id: number | null,
		merch_art_0: number | null,
		merch_art_1: number | null,
		merch_art_2: number | null
	},
	featured_track_license_id: number | null,
	licensed_item: null | any,
	download_available: boolean
}

// https://bandcamp.com/api/fancollection/1/collection_items
// https://bandcamp.com/api/fancollection/1/hidden_items
//  Referer: <FAN URL>
// https://bandcamp.com/api/fancollection/1/wishlist_items
//  Referer: <FAN_URL>/wishlist
export type PrivBandcampAPI$Fan$CollectionItemsResult = {
	items: PrivBandcampAPI$Fan$CollectionMediaItem[],
	more_available: boolean,
	tracklists: {
		// map of item IDs to their (partial) tracklists
		[id: string]: {
			id: number,
			title: string,
			artist: string,
			track_number: number | null,
			duration: number,
			file: {
				// map of audio file types to URLs
				[filetype: (PrivBandcampAudioFileType | string)]: string
			}
		}[],
	},
	redownload_urls: {
		// TODO maybe a map of IDs to URLs
	},
	item_lookup: {},
	last_token: string, // "xxxxxxxxxxx:xxxxxxxxxxxx:t:1:"
	purchase_infos: {},
	collectors: {}
}
