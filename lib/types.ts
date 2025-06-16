import { PrivBandcampAudioFileType } from "./private_types";

export enum BandcampItemType {
	Artist = 'artist',
	Label = 'label',
	Album = 'album',
	Track = 'track',
	Fan = 'fan',
}
export enum BandcampItemTypeChar {
	Band = 'b',
	Album = 'a',
	Track = 't',
	Fan = 'f',
}
export const BandcampItemTypes: BandcampItemType[] = Object.values(BandcampItemType);

export type BandcampAudioFileType = PrivBandcampAudioFileType;

export enum BandcampImageSize {
	Small = 'small',
	Medium = 'medium',
	Large = 'large',
}

export type BandcampImage = {
	url: string
	size: BandcampImageSize
	width?: number
	height?: number
}

export type BandcampLink = {
	url: string
	name: string
}



export type BandcampIdentities = {
	fan?: BandcampFanIdentity
}

export type BandcampFanIdentity = {
	id: string
	url: string
	username: string
	private: boolean
	verified: boolean
	photoId: number
	name: string
	images?: BandcampImage[]
}



export type BandcampSearchResult = {
	type: BandcampItemType
	name: string
	url: string
	imageURL?: string
	artistName?: string
	artistURL?: string
	albumName?: string
	albumURL?: string
	location?: string
	tags: string[]
	genre?: string
	releaseDate?: string
	numTracks?: number
	numMinutes?: number
}

export type BandcampSearchResultsList = {
	items: BandcampSearchResult[]
	prevURL: string | null
	nextURL: string | null
}



export type BandcampTrack = {
	id?: string
	type: BandcampItemType.Track
	url: string
	name: string
	artistName: string
	artistURL: string
	artist?: BandcampArtist
	albumName?: string
	albumURL?: string
	images: BandcampImage[]
	tags: string[]
	description: string
	releaseDate?: string
	trackNumber?: number
	duration?: number
	audioSources?: BandcampAudioSource[]
	playable?: boolean
}

export type BandcampAudioSource = {
	type: BandcampAudioFileType | string
	url: string
}



export type BandcampAlbum = {
	id?: string
	type: BandcampItemType.Album
	url: string
	name: string
	artistName: string
	artistURL: string
	artist?: BandcampArtist
	images: BandcampImage[]
	tags: string[]
	description: string
	releaseDate?: string
	tracks: BandcampAlbumTrack[]
}

export type BandcampAlbumTrack = {
	id?: string
	type: BandcampItemType.Track
	url: string
	name: string
	artistName: string
	artistURL: string
	albumName: string
	albumURL: string
	images: BandcampImage[]
	trackNumber: number
	duration?: number
	audioSources?: BandcampAudioSource[]
	playable?: boolean
}

export type BandcampArtist = {
	id?: string
	type: (BandcampItemType.Artist | BandcampItemType.Label)
	url: string
	name: string
	location?: string
	description: string
	images: BandcampImage[]
	shows?: BandcampArtistShow[]
	links?: BandcampLink[]
	isLabel: boolean
	albums?: BandcampArtistPageItem[]
}

export type BandcampArtistShow = {
	date: string
	url: string
	venueName: string
	location: string
}



export type BandcampArtistPageItem = {
	id: string
	type: BandcampItemType.Track | BandcampItemType.Album
	url: string
	name: string
	artistName: string
	artistURL: string
	images: BandcampImage[]
	releaseDate?: string
}



export type BandcampFan = {
	id: string
	type: BandcampItemType.Fan
	url: string
	username: string
	name: string
	description?: string
	images?: BandcampImage[]

	collection?: BandcampFan$CollectionSection | null
	hiddenCollection?: BandcampFan$CollectionSection | null
	wishlist?: BandcampFan$WishlistSection | null

	followingArtists?: BandcampFan$ArtistSection | null
	followingFans?: BandcampFan$FanSection | null
	followers?: BandcampFan$FanSection | null
}



export type BandcampFan$PageSection<T> = {
	lastToken: string
	itemCount: number
	batchSize: number
	items: T[]
}
export type BandcampFan$CollectionSection = BandcampFan$PageSection<BandcampFan$CollectionNode>
export type BandcampFan$WishlistSection = BandcampFan$PageSection<BandcampFan$WishlistNode>
export type BandcampFan$ArtistSection = BandcampFan$PageSection<BandcampFan$FollowedArtistNode>
export type BandcampFan$FanSection = BandcampFan$PageSection<BandcampFan$FollowedFanNode>

export type BandcampFan$CollectionItemsPage<T> = {
	hasMore: boolean
	lastToken: string
	items: T[]
}
export type BandcampFan$CollectionPage = BandcampFan$CollectionItemsPage<BandcampFan$CollectionNode>
export type BandcampFan$WishlistPage = BandcampFan$CollectionItemsPage<BandcampFan$WishlistNode>
export type BandcampFan$FollowedArtistPage = BandcampFan$CollectionItemsPage<BandcampFan$FollowedArtistNode>
export type BandcampFan$FollowedFanPage = BandcampFan$CollectionItemsPage<BandcampFan$FollowedFanNode>

export type BandcampFan$CollectionNode = {
	itemId: string
	userComment?: string
	token: string
	dateAdded: string
	item: BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum
}

export type BandcampFan$WishlistNode = {
	itemId: string
	token: string
	dateAdded: string
	item: BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum
}

export type BandcampFan$FollowedNode<T> = {
	itemId: string
	token: string
	dateFollowed: string
	item: T
}
export type BandcampFan$FollowedArtistNode = BandcampFan$FollowedNode<BandcampFan$CollectionArtist>
export type BandcampFan$FollowedFanNode = BandcampFan$FollowedNode<BandcampFan$CollectionFan>

export type BandcampFan$CollectionTrack = {
	id: string
	type: BandcampItemType.Track
	url: string
	name: string
	artistName: string
	artistURL: string
	albumURL?: string
	albumName?: string | null
	albumSlug?: string // included because we can't get the album name on some calls
	images?: BandcampImage[]
	trackNumber?: number
	duration?: number
	audioSources?: BandcampAudioSource[]
}

export type BandcampFan$CollectionAlbum = {
	id: string
	type: BandcampItemType.Album
	url: string
	name: string
	artistName: string
	artistURL: string
	images?: BandcampImage[]
}

export type BandcampFan$CollectionArtist = {
	id: string
	type: (BandcampItemType.Artist | BandcampItemType.Label)
	url: string
	name: string
	location?: string | null
	images?: BandcampImage[]
}

export type BandcampFan$CollectionFan = {
	id: string
	type: BandcampItemType.Fan
	url: string
	name: string
	location?: string | null
	images?: BandcampImage[]
}

export type BandcampFan$SearchItemsPage<T> = {
	items: T[]
}

export type BandcampFan$SearchMediaItemsPage = BandcampFan$SearchItemsPage<BandcampFan$CollectionTrack | BandcampFan$CollectionAlbum>;



export type BandcampFanFeedPage = {
	oldestStoryDate: number
	newestStoryDate: number
	stories: BandcampFanFeed$Story[]
}

export type BandcampFanFeed$Story = {
	type: BandcampFanFeed$StoryType
	date: string
	why?: string | null
	fan: BandcampFanFeed$Fan
	item?: BandcampFanFeed$Track | BandcampFanFeed$Album
}

export enum BandcampFanFeed$StoryType {
	FriendPurchased = 'fp',
	SomeoneAlsoPurchased = 'np',
	NewRelease = 'nr',
}

export type BandcampFanFeed$Fan = {
	id: string | number
	type: BandcampItemType.Fan
	url: string
	username: string
	name: string
	images?: BandcampImage[]
}

export type BandcampFanFeed$Track = {
	id?: string | number
	type: BandcampItemType.Track
	url: string
	name: string
	artistName: string
	artistURL: string
	images: BandcampImage[]
	audioSources?: BandcampAudioSource[]
}

export type BandcampFanFeed$Album = {
	id?: string | number
	type: BandcampItemType.Album
	url: string
	name: string
	artistName: string
	artistURL: string
	images: BandcampImage[]
	featuredTrack?: {
		id?: string | number
		type: BandcampItemType.Track
		url?: string
		name: string
		trackNumber: number
		audioSources?: BandcampAudioSource[]
	}
}
