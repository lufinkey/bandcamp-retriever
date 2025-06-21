
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
