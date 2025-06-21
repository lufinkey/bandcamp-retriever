import type {
	BandcampImage,
	BandcampItemType
} from './common'
import type {
	BandcampAudioSource
} from './track'

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
