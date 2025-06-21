import type {
	PrivBandcampAudioFileType,
	PrivBandcampCurrencyCode,
	PrivBandcampCurrencyData,
	PrivBandcampIdentities,
	PrivBandcampLangShort
} from './common';

export type PrivBandcampHomePageData = {
	recaptcha_public_key: string,
	invisible_recaptcha_public_key: string,
	scroll_to_discover: boolean,
	la_invitation: null | any,
	verify_paypal_link_invalid: null | any,
	show_fan_collection_info: boolean,
	templglobals: {
		endpoint_mobilized: boolean,
		is_phone: boolean
	},
	localize_page: boolean,
	locale: PrivBandcampLangShort,
	languages: {
		[locale: (PrivBandcampLangShort | string)]: string
	},
	help_center_url: string, // "https://get.bandcamp.help/hc/en-us",
	bcw_seq_details: {
		num_shows: number,
		show_ids: number[]
	},
	bcw_data: {
		[id: string]: {
			show_id: number,
			date: string, // "19 Dec 2023 00:00:00 GMT"
			published_date: string, // "19 Dec 2023 00:00:00 GMT"
			title: string,
			subtitle: string,
			desc: string,
			show_image_id: number,
			show_screen_image_id: number,
			show_v2_image_id: number,
			image_caption: string,
			audio_url_hash: {
				subdomain: string,
				custom_domain: string | null,
				custom_domain_verified: string | null,
				slug: string,
				item_type: 't' | string
			},
			audio_title: string,
			audio_stream: {
				// file types mapped to URLs
				[fileType: (PrivBandcampAudioFileType | string)]: string
			},
			audio_track_id: number,
			stream_infos: {
				encodings_id: number,
				stream_type: number,
				format: number,
				file_id: number | null,
				metadata_crc: null
			},
			audio_duration: number, // 10485.1
			button_color: string, // "905d9a"
			dark_mode: null | any,
			short_desc: string,
			tracks: Array<{
				track_id: number,
				title: string,
				url_hints: {
					subdomain: string,
					custom_domain: string | null,
					custom_domain_verified: string | null,
					slug: string,
					item_type: 'a' | string
				},
				track_url: string,
				artist: string,
				location_text: string | null,
				album_id: number,
				album_title: string,
				is_preorder: boolean,
				band_id: number,
				timecode: number,
				track_art_id: number,
				bio_image_id: number,
				merch_ids: number[],
				package_image_ids: number[],
				is_set_price: boolean,
				price: number,
				is_purchasable: boolean,
				currency: PrivBandcampCurrencyCode | string,
				label: string,
				require_email: boolean | null,
				album_url: string,
				url: string
			}>
		}
	},
	bcw_index: number,
	bcnt_seq: number[],
	bcnt_data: {
		[id: string]: {
			id: number,
			tralbum_key: string, // "axxxxxxxxx"
			tralbum_id: number,
			tralbum_type: 'a' | string,
			tralbum_url_hash: {
				subdomain: string,
				custom_domain: string | null,
				custom_domain_verified: string | null,
				item_type: 'a' | string,
				slug: string
			},
			stream_infos: {
				[id: string]: {
					encodings_id: number,
					stream_type: 't' | string,
					format: number,
					file_id: number,
					metadata_crc: null
				}
			},
			title: string,
			artist: string,
			band_id: number,
			date: string, // "31 Dec 2023 00:00:00 GMT"
			published_date: string, // "18 Dec 2023 00:00:00 GMT"
			mod_date: string, // "01 Jan 2024 19:24:48 GMT"
			desc: string,
			is_preorder: boolean,
			audio_track_id: number,
			audio_duration: number,
			featured_track_id: number,
			art_id: number,
			video_id: number | null,
			genre: string,
			audio_url: {
				// map of file types to URLs
				[fileType: (PrivBandcampAudioFileType | string)]: string
			},
			tralbum_url: string
		}
	},
	bcnt_firstpage: Array<{
		id: number,
		tralbum_key: string, // "axxxxxxxxxx"
		tralbum_id: number,
		tralbum_type: 'a' | string,
		tralbum_url_hash: {
			subdomain: string,
			custom_domain: string | null,
			custom_domain_verified: string | null,
			item_type: 'a' | string,
			slug: string
		},
		stream_infos: {
			[id: string]: {
				encodings_id: number,
				stream_type: 't' | string,
				format: number,
				file_id: number,
				metadata_crc: null
			}
		},
		title: string,
		artist: string,
		band_id: 4177110320,
		date: string, // "07 Jan 2024 00:00:00 GMT"
		published_date: string, // "07 Jan 2024 00:00:00 GMT"
		mod_date: string, // "07 Jan 2024 17:49:39 GMT"
		desc: string,
		is_preorder: boolean,
		audio_track_id: number,
		audio_duration: number,
		featured_track_id: number,
		art_id: number,
		video_id: number | null,
		genre: string,
		audio_url: {
			[fileType: (PrivBandcampAudioFileType | string)]: string
		},
		tralbum_url: string
	}>,
	curated_event_listings: Array<{
		album_art_id: number,
		artist: string,
		currency: PrivBandcampCurrencyCode | string,
		description: string,
		doors_open: boolean,
		event_id: number,
		event_type: 'l' | string,
		image_color_one: string, // "605752"
		image_color_two: string, // "958983"
		image_id: number,
		includes_digital: boolean,
		is_attending: boolean | null,
		is_nyp: boolean,
		live_event_url: string,
		live_ticket_url: string,
		max_attendees: number | null,
		price: {
			amount: number,
			currency: PrivBandcampCurrencyCode | string,
			is_money: boolean
		},
		scheduled_start_date: string, // 09 Jan 2024 18:00:00 GMT
		selected_timezone: string,
		start_date: null,
		state: 'preview' | string,
		ticket_package_id: number,
		title: string,
		token: string // "xxxxxxxxxx:xxxxxx"
	}>,
	fnsp_seq: Array<{
		fan_id: number,
		published_date: string // "18 Feb 2021 01:04:37 GMT"
	}>,
	fnsp_data: {
		[id: string]: {
			fan_id: number,
			bio: string,
			date: string, // "18 Feb 2021 00:00:00 GMT"
			published_date: string, // "18 Feb 2021 01:04:37 GMT"
			items: Array<{
				sequence: number,
				item_id: number,
				item_type: 'a' | string,
				title: string,
				artist_name: string,
				url_hints: {
					subdomain: string,
					custom_domain: string | null,
					custom_domain_verified: string | null,
					item_type: 'a' | string,
					slug: string
				},
				band_id: number,
				art_id: number,
				audio_track_encodings_id: number,
				audio_track_id: number,
				favorite_track_id: null,
				favorite_track_title: null,
				favorite_track_index: null,
				comment: string,
				stream_url: {
					// map of file types to URLs
					[fileType: (PrivBandcampAudioFileType | string)]: string
				}
			}>,
			username: string,
			name: string,
			location: string,
			item_stream_infos: {
				[id: string]: {
					encodings_id: 304456358,
					stream_type: "t",
					format: 101,
					file_id: 1360292998,
					metadata_crc: null
				}
			},
			bio_image_id: number
		}
	},
	carousel: {
		big_item: {
			story_id: 168907,
			story_type: {
				code: 'f',
				name: string,
				link: string
			},
			image_id: number,
			title: string,
			blurb: string,
			article_url: string,
			story_date: string, // "04 Jan 2024 14:44:10 GMT"
			is_bcweekly: boolean | null
		},
		small_items: Array<{
			story_id: 168869,
			story_type: {
				code: 'f',
				name: string,
				link: string
			},
			image_id: number,
			title: string,
			blurb: string,
			article_url: string,
			story_date: string, // "05 Jan 2024 14:48:31 GMT"
			is_bcweekly: null
		}>
	},
	discover_2015: {
		args: {
			g: 'all' | any,
			t: null | any,
			s: 'top' | any,
			f: 'all' | any
			r: null | any,
			w: number | any,
			p: number | any,
			gn: number | any,
			following: boolean
		},
		options: {
			g: Array<{
				name: 'all' | string,
				value: 'all' | string,
				norm_name: 'all' | string,
				id: number
			}>,
			t: {
				[genre: string]: Array<{
					name: string,
					value: string,
					norm_name: string
				}>,
			}
			s: Array<{
				name: "best-selling",
				value: string
			}>
			f: Array<{
				name: string,
				value: string
			}>,
			w: Array<{
				name: string,
				title: string,
				value: number
			}>,
			l: Array<{
				name: string,
				value: string
			}>,
			r: Array<{
				name: string,
				value: string
			}>,
		},
		discover_colors: {
			[genre: string]: {
				baseHue: number,
				baseSat: number,
				baseLight: number,
				baseAlpha: number
			}
		},
		discover_color_offsets: Array<{
			hue: number,
			sat: number,
			light: number,
			alpha: number
		}>,
		categories: Array<('g' | 't' | 's' | 'f' | 'w' | 'gn' | 'r' | string)>,
		initial: {
			colors: {
				[char: ('g' | 't' | 's' | 'f' | 'w' | 'gn' | 'r' | string)]: string // "hsla(194, 48%, 50%, 1)"
			},
			server_items: Array<{
				type: 'a' | string,
				id: number,
				category: string, // "solr_hack"
				extras: null,
				score: number,
				band_id: number,
				item_type_id: string, // "axxxxxxxxxsolr_hack",
				is_preorder: boolean | null,
				publish_date: string, // "04 Jan 2024 13:27:26 GMT"
				genre_text: string,
				primary_text: string,
				secondary_text: string,
				art_id: number,
				alt_art_image_id: number | null,
				url_hints: {
					subdomain: string,
					custom_domain: string | null,
					custom_domain_verified: string | null,
					slug: string,
					item_type: 'a' | string
				},
				featured_track: {
					file: {
						// map of file types to URLs
						[fileType: (PrivBandcampAudioFileType | string)]: string
					},
					duration: number,
					id: number,
					title: string,
					encodings_id: number
				},
				location_text: string,
				package_title: string | null,
				bio_image: {
					image_id: number,
					height: number,
					width: number
				},
				package_art1: null,
				package_art2: null,
				package_art3: null,
				package_art4: null,
				recommendations: null,
				license_id: null,
				territories: null
			}>,
			total_count: number
		}
	},
	identities: PrivBandcampIdentities,
	is_corp_home: boolean,
	bcweekly_sharing: boolean,
	signup_params: {},
	cfg: {
		single_sign_up: boolean,
		fan_signup_use_captcha: boolean,
		login_use_captcha: boolean,
		label_signup: boolean,
		open_signup: boolean,
		stream_buffer_duration_stats: boolean,
		fan_page_2017: boolean,
		gift_cards: boolean,
		order_history: boolean,
		header_rework_2018: boolean,
		discover_2023_home_enabled: boolean,
		menubar_autocomplete_enabled: boolean,
		use_elasticsearch_backed_search: boolean,
		new_search_api_service: boolean,
		search_tracking: boolean,
		search_discovery_one_filter_desktop_only: boolean,
		search_discovery_one_filter_rollout: boolean,
		community: boolean
	},
	fan_onboarding: {
		tooltips: null | any,
		num_tooltips: number,
		tooltip_number: null | any,
		current_index: null | any,
		complete: boolean,
		show_collection_banner: boolean,
		show_feed_banner: boolean,
		show_verify_banner: boolean,
		first_wishlisted_item_title: null | any,
		first_wishlisted_item_type: null | any,
		first_purchased_item_title: null | any,
		first_purchased_item_type: null | any,
		template: null | any,
		email: string,
		has_collection: boolean,
		has_seen_tooltips: boolean,
		show_first_wishlist_tooltip: boolean,
		deferred: null
	},
	menubar: {
		any_pro: boolean,
		fan_url: string,
		has_wishlist: boolean,
		has_collection: boolean,
		gift_card_balance: null | any,
		is_tralbum_page: boolean,
		admin_level: number,
		artist_service_active: boolean,
		artist_subscriptions_enabled: boolean,
		active_profile_photo: number,
		cart_quantity: null | any,
		discover_root: string,
		page_path: string,
		is_fan_page: boolean,
		is_download_page: boolean,
		show_crowdfunding_link: boolean,
		show_add_live_show: boolean,
		show_add_listening_party: boolean,
		show_guide_link: boolean
	},
	show_newsletter_invite_banner: null | any,
	currency_data: {
		info: {
			[currencyCode: (PrivBandcampCurrencyCode | string)]: PrivBandcampCurrencyData
		},
		list: Array<(PrivBandcampCurrencyCode | string)>,
		rates: {
			[currencyCode: (PrivBandcampCurrencyCode | string)]: PrivBandcampCurrencyData
		},
		setting: null | any,
		current: null | any
	},
	show_tos_banner: boolean
}
