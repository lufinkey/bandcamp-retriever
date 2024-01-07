
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

export type PrivBandcampAudioFileType = 'mp3-v0' | 'mp3-128' | 'mp3-320' | 'flac' | 'aac-hi' | 'aiff-lossless' | 'vorbis' | 'alac' | 'wav';

export type PrivBandcampPlatform = 'win';


// HOME PAGE PAGEDATA

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
};

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



// TRACK/ALBUM PAGE DATA TYPES

export type PrivBandcampMediaLDJsonType = 'MusicRecording' | 'MusicGroup' | 'MusicAlbum' | 'MusicRelease' | 'Product';

export type PrivBandcampMediaLDJsonAdditionalProp = {
	"@type": ('PropertyValue' | string),
	name: string,
	value: any
};

export type PrivBandcampMediaLDJsonItem = {
	"@type": (PrivBandcampMediaLDJsonType | string) | (PrivBandcampMediaLDJsonType | string),
	"@id": string, // URL of item
	additionalProperty: PrivBandcampMediaLDJsonAdditionalProp[],
};

export type PrivBandcampMediaLDJsonAlbumReleaseItem = PrivBandcampMediaLDJsonItem & {
	"@type": ('MusicRelease' | string) | ('MusicRelease' | 'Product' | string)[],
	name: string,
	description?: (string | null),
	offers?: {
		"@type": ('Offer' | string),
		url: string, // "https://nnnnnnnn.bandcamp.com/track/nnnnnn#txxxxxxxxx-buy"
		priceCurrency: (PrivBandcampCurrencyCode | string),
		price: number, // 0,
		priceSpecification: {
			minPrice: number, // 0
		},
		availability: ('OnlineOnly' | string)
	},
	musicReleaseFormat?: ('DigitalFormat' | string),
	image?: string | string[] | null // array of image URLs
};

export type PrivBandcampMediaLDJsonPublisher = PrivBandcampMediaLDJsonItem & {
	"@type": ('MusicGroup' | string),
	name: string,
	image: string, // image URL
	genre: string, // genre URL "https://bandcamp.com/discover/folk"
	description: string,
	mainEntityOfPage: {
		"@type": ('WebPage' | string),
		"url": string,
		"name": string // "SoundCloud", "Instagram", etc
	}[]
	subjectOf: ({
		"@type": ('WebPage' | string),
		url: string,
		name: string,
		additionalProperty: {
			"@type": ('PropertyValue' | string),
			name: string,
			value: any
		}[]
	})[],
	foundingLocation: {
		"@type": ('Place' | string),
		name: string
	}
};

export type PrivBandcampMediaLDJsonPerson = {
	"@type": ('Person' | string),
	url: string, // URL of the person
	image: string,
	additionalProperty: PrivBandcampMediaLDJsonAdditionalProp[],
	name: string
};

export type PrivBandcampMediaLDJsonArtist = {
	"@type": ('MusicGroup' | string),
	name: string,
	"@id": string // artist page URL
};

export type PrivBandcampMediaLDJsonComment = {
	"@type": ('Comment' | string),
	author: PrivBandcampMediaLDJsonPerson,
	text: string | string[]
};

// the root LDJson structure for a track page
// $('script[type="application/ld+json"]').html()
export type PrivBandcampTrackLDJson = PrivBandcampMediaLDJsonItem & {
	"@type": ('MusicRecording' | string),
	name: string,
	duration: string, // "P00H02M20S"
	dateModified: string, // "01 Jan 2020 12:00:00 GMT"
	datePublished: string, // "01 Jan 2020 12:00:00 GMT"
	description?: string | null,
	inAlbum: (PrivBandcampMediaLDJsonItem & {
		"@type": ('MusicAlbum' | string),
		name: string,
		albumRelease: PrivBandcampMediaLDJsonAlbumReleaseItem[],
		albumReleaseType: ('SingleRelease' | string),
	}),
	byArtist: PrivBandcampMediaLDJsonArtist,
	publisher: PrivBandcampMediaLDJsonPublisher,
	copyrightNotice: string, // "All Rights Reserved"
	recordingOf: {
		"@type": ('MusicComposition' | string),
		lyrics: {
			"@type": ('CreativeWork' | string),
			text: string
		}
	},
	keywords: string[],
	image: string // image URL
	mainEntityOfPage: string, // track URL
	"@context": string // "https://schema.org"
};


export type PrivBandcampAlbumLDJsonTrack = {
	"@type": ('ListItem' | string),
	position: number, // 1
	item: PrivBandcampMediaLDJsonItem & {
		"@type": ('MusicRecording' | string),
		name: string,
		duration: string, // "P00H02M20S"
		copyrightNotice: string, // "All Rights Reserved"
		recordingOf: {
			"@type": ('MusicComposition' | string),
			lyrics: {
				"@type": ('CreativeWork' | string),
				text: string
			}
		},
		mainEntityOfPage: string
	}
};

// the root LDJson structure for an album page
// $('script[type="application/ld+json"]').html()
export type PrivBandcampAlbumLDJson = PrivBandcampMediaLDJsonItem & {
	"@type": ('MusicAlbum' | string),
	name: string,
	mainEntityOfPage: string,
	dateModified: string, // "01 Jan 2020 12:00:00 GMT"
	albumRelease: PrivBandcampMediaLDJsonAlbumReleaseItem[],
	albumReleaseType: ('AlbumRelease' | string),
	byArtist: PrivBandcampMediaLDJsonArtist,
	publisher: PrivBandcampMediaLDJsonPublisher,
	numTracks: number, // 9
	track: {
		"@type": ('ItemList' | string),
		numberOfItems: number, // 9
		itemListElement: PrivBandcampAlbumLDJsonTrack[]
	},
	image: string | string[], // image URL
	keywords: string[],
	datePublished: string, // "01 Jan 2020 12:00:00 GMT"
	description?: string | null,
	copyrightNotice: string, // "All Rights Reserved"
	comment: PrivBandcampMediaLDJsonComment[],
	sponsor: PrivBandcampMediaLDJsonPerson[],
	"@context": string // "https://schema.org"
}


export type PrivBandcampTRAlbumDataTrack = {
	id: number,
	track_id: number,
	file: {
		// map of file types to URLs
		[key: (PrivBandcampAudioFileType | string)]: string
	},
	artist: string | null,
	title: string,
	encodings_id: number,
	license_type: number // 1
	private: null | any,
	track_num: number, // 1
	album_preorder: boolean,
	unreleased_track: boolean,
	title_link: string, // "/track/TRACK-SLUG"
	has_lyrics: boolean,
	has_info: boolean,
	streaming: number, // 1
	is_downloadable: boolean,
	has_free_download: boolean | null,
	free_album_download: boolean,
	duration: number // 140.11,
	lyrics: string | null, // < only available on the track page
	sizeof_lyrics: number, // 158,
	is_draft: boolean,
	video_source_type: string | null,
	video_source_id: number | null,
	video_mobile_url: string | null,
	video_poster_url: string | null,
	video_id: number | null,
	video_caption: string | null,
	video_featured: null | any,
	alt_link: null | any,
	encoding_error: null | any,
	encoding_pending: null | any,
	play_count: number | null,
	is_capped: boolean | null,
	track_license_id: number | null
};

// the root structure for TRAlbumData
// $('script[data-tralbum]').attr('data-tralbum')
export type PrivBandcampTRAlbumData = {
	"for the curious": string, // "https://bandcamp.com/help/audio_basics#steal https://bandcamp.com/terms_of_use",
	current: {
		audit: 0,
		title: "tell me im wrong",
		new_date: string, // "01 Jan 2020 12:00:00 GMT"
		mod_date: string, // "01 Jan 2020 12:00:00 GMT"
		publish_date: string, // "01 Jan 2020 12:00:00 GMT"
		private: null | any,
		killed: null | any,
		download_pref: number, // 2,
		require_email: null | boolean,
		require_email_0: null | number,
		is_set_price: null | boolean,
		set_price: number, // 7
		minimum_price: number, // 0,
		minimum_price_nonzero: number, // 7
		artist: string | null,
		about: string | null,
		credits: null | any,
		auto_repriced: null | any,
		new_desc_format: number, // 1,
		band_id: number,
		selling_band_id: number,
		art_id: number,
		download_desc_id: number | null,
		release_date: string, // "01 Jan 2020 12:00:00 GMT"
		upc: null | any,
		purchase_url: string | null,
		purchase_title: string | null,
		featured_track_id: number,
		id: number,
		type: 'album' | 'track' | string,
		
		// track page only properties
		
		track_number?: number
		file_name?: string | null,
		preorder_download?: null | any,
	},
	preorder_count: number | null,
	hasAudio: boolean,
	art_id: number,
	packages: null | any,
	defaultPrice: number, // 7,
	freeDownloadPage: string // "https://bandcamp.com/download?id=xxxxxxxxx&ts=xxxxxxxxx.xxxxxxxxxx&tsig=xxxxxxxxxxxxxxxxxx&type=album",
	FREE: number, // 1
	PAID: number, // 2,
	artist: string, // artist name
	item_type: 'album' | 'track' | string,
	id: number,
	last_subscription_item: null | any,
	has_discounts: boolean,
	is_bonus: boolean | null,
	play_cap_data: null | any,
	client_id_sig: null | any,
	is_purchased: boolean,
	items_purchased: {
		packages: {},
		bundles: {},
		crowdfunding_campaign: {}
	},
	is_private_stream: boolean | null,
	is_band_member: boolean | null,
	licensed_version_ids: null | any,
	package_associated_license_id: null | any,
	has_video: boolean | null,
	tralbum_subscriber_only: boolean,
	featured_track_id: number | null,
	initial_track_num: number | null,
	is_preorder: boolean,
	album_is_preorder: boolean,
	album_release_date: string, // "01 Jan 2020 12:00:00 GMT"
	trackinfo: PrivBandcampTRAlbumDataTrack[],
	playing_from: string, // "album page"
	url: string,
	use_expando_lyrics: boolean
};



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
		[filetype: (PrivBandcampAudioFileType | string)]: string
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
	featured_track_url: string | null,
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
	package_details: null | any,
	num_streamable_tracks: number,
	is_purchasable: boolean,
	is_private: boolean,
	is_preorder: boolean,
	is_giftable: boolean,
	is_subscriber_only: boolean,
	is_subscription_item: boolean,
	hidden: null | any,
	gift_sender_name: string | null,
	gift_sender_note: string | null,
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

// root structure for fan page data
// $('#pagedata').attr('data-blob')
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

// https://bandcamp.com/api/fan/2/collection_summary
//  Referer: <FANPAGE_URL>
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
};

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



// FAN API FOLLOWING BANDS TYPES

export type PrivBandcampAPI$Fan$FollowingArtist = {
	band_id: number,
	image_id: number,
	art_id: number,
	url_hints: {
		subdomain: string,
		custom_domain: string | null
	},
	name: string,
	is_following: boolean,
	is_subscribed: boolean | null,
	location: string,
	date_followed: string, // "01 Jan 2017 12:00:00 GMT"
	token: string // "xxxxxxxxx:xxxxxxxxxx"
}

// https://bandcamp.com/api/fancollection/1/following_bands
//  Referer: <FAN URL>/following/artists_and_labels
export type PrivBandcampAPI$Fan$FollowingArtistsResult = {
	followeers: PrivBandcampAPI$Fan$FollowingArtist[],
	more_available: boolean,
	last_token: string // "xxxxxxxxxx:xxxxxxxxx"
}

// FAN API FOLLOWING / FOLLOWER FANS TYPES

export type PrivBandcampAPI$FanFollowItem = {
	fan_id: number,
	band_id: number | null,
	fan_url: string | null,
	image_id: number,
	trackpipe_url: string,
	name: string,
	is_following: boolean,
	location: string | null,
	date_followed: string, // "01 Jan 2021 12:00:00 GMT",
	token: string // "xxxxxxxxxx:xxxxxxx"
}

// https://bandcamp.com/api/fancollection/1/following_fans
//  Referer: <FAN URL>/following/fans
// https://bandcamp.com/api/fancollection/1/followers
//  Referer: <FAN URL>/followers
export type PrivBandcampAPI$Fan$FanFollowItemsResult = {
	followeers: PrivBandcampAPI$FanFollowItem[],
	more_available: boolean,
	last_token: string // "xxxxxxxxxx:xxxxxxx"
}


// FAN API SEARCH ITEMS TYPES

// https://bandcamp.com/api/fancollection/1/search_items
//  Referer: <FAN URL>/wishlist
export type PrivBandcampAPI$Fan$SearchItemsResult = {
	tralbums: PrivBandcampAPI$Fan$CollectionMediaItem[],
	gifts: any[],
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
		}[]
	},
	redownload_urls: {},
	similar_gift_ids: any[],
	item_lookup: {
		// map of item IDs to their types and purchased states
		[id: string]: {
			item_type: 't' | 'a' | string,
			purchased: boolean
		}
	},
	search_key: string // the search term
}
