import type {
	PrivBandcampAudioFileType,
	PrivBandcampCurrencyCode
} from './common';

export enum PrivBandcampMediaLDJsonType {
	MusicRecording = 'MusicRecording',
	MusicGroup = 'MusicGroup',
	MusicAlbum = 'MusicAlbum',
	MusicRelease = 'MusicRelease',
	Product = 'Product',
}

export type PrivBandcampMediaLDJsonAdditionalProp = {
	"@type": ('PropertyValue' | string),
	name: string,
	value: any
}

export type PrivBandcampMediaLDJsonItem = {
	"@type": (PrivBandcampMediaLDJsonType | PrivBandcampMediaLDJsonType[]),
	"@id": string, // URL of item
	additionalProperty: PrivBandcampMediaLDJsonAdditionalProp[],
}

export type PrivBandcampMediaLDJsonAlbumReleaseItem = PrivBandcampMediaLDJsonItem & {
	"@type": (PrivBandcampMediaLDJsonType.MusicRelease | string)
		| (PrivBandcampMediaLDJsonType.MusicRelease | PrivBandcampMediaLDJsonType.Product | string)[],
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
	"@type": PrivBandcampMediaLDJsonType.MusicGroup,
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
		"@type": 'Place',
		name: string
	}
}

export type PrivBandcampMediaLDJsonPerson = {
	"@type": 'Person',
	url: string, // URL of the person
	image: string,
	additionalProperty: PrivBandcampMediaLDJsonAdditionalProp[],
	name: string
}

export type PrivBandcampMediaLDJsonArtist = {
	"@type": PrivBandcampMediaLDJsonType.MusicGroup,
	name: string,
	"@id": string // artist page URL
}

export type PrivBandcampMediaLDJsonComment = {
	"@type": 'Comment',
	author: PrivBandcampMediaLDJsonPerson,
	text: string | string[]
}

// the root LDJson structure for a track page
// $('script[type="application/ld+json"]').html()
export type PrivBandcampTrackLDJson = PrivBandcampMediaLDJsonItem & {
	"@type": PrivBandcampMediaLDJsonType.MusicRecording,
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
}


export type PrivBandcampAlbumLDJsonTrack = {
	"@type": ('ListItem' | string),
	position: number, // 1
	item: PrivBandcampMediaLDJsonItem & {
		"@type": PrivBandcampMediaLDJsonType.MusicRecording,
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
}

// the root LDJson structure for an album page
// $('script[type="application/ld+json"]').html()
export type PrivBandcampAlbumLDJson = PrivBandcampMediaLDJsonItem & {
	"@type": PrivBandcampMediaLDJsonType.MusicAlbum,
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
	license_type: number,
	private: boolean | null,
	track_num: number,
	album_preorder: boolean,
	unreleased_track: boolean,
	title_link: string,  // "/track/TRACK-SLUG"
	has_lyrics: boolean,
	has_info: boolean,
	streaming: number,
	is_downloadable: boolean,
	has_free_download: boolean | null,
	free_album_download: boolean,
	duration: number,  // 140.11,
	lyrics?: string | null, // < only available on the track page
	sizeof_lyrics: number, // 158,
	is_draft: boolean,
	video_source_type: string | null,
	video_source_id: string | null,
	video_mobile_url: string | null,
	video_poster_url: string | null,
	video_id: string | null,
	video_caption: string | null,
	video_featured: string | null,
	alt_link: string | null,
	encoding_error: string | null,
	encoding_pending: string | null,
	play_count: number | null,
	is_capped: boolean | null,
	track_license_id: number | null,
}

// the root structure for TRAlbumData
// $('script[data-tralbum]').attr('data-tralbum')
export type PrivBandcampTRAlbumData = {
	"for the curious": string, // "https://bandcamp.com/help/audio_basics#steal https://bandcamp.com/terms_of_use",
	current: {
		audit: 0,
		title: string, // "tell me im wrong"
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
}
