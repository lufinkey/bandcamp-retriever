
export type nullish = null | undefined

export type BandcampImage = {
	url: string
	size: 'small' | 'medium' | 'large'
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
	type: string
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
	type: 'track' | string
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
	type: string
	url: string
}



export type BandcampAlbum = {
	id: string
	type: 'album' | string
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
	type: 'track'
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
	type: 'artist' | 'label'
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
	type: 'track' | 'album' | string
	url: string
	name: string
	artistName: string
	artistURL: string
	images: BandcampImage[]
	releaseDate?: string
}



export type BandcampFan = {
	id: string
	type: 'fan'
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

export type BandcampFan$APIPage<T> = {
	hasMore: boolean
	lastToken: string
	items: T[]
}
export type BandcampFan$APICollectionPage = BandcampFan$APIPage<BandcampFan$CollectionNode>
export type BandcampFan$APIWishlistPage = BandcampFan$APIPage<BandcampFan$WishlistNode>
export type BandcampFan$APIFollowedArtistPage = BandcampFan$APIPage<BandcampFan$FollowedArtistNode>
export type BandcampFan$APIFollowedFanPage = BandcampFan$APIPage<BandcampFan$FollowedFanNode>

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
	type: 'track' | string
	url: string
	name: string
	artistName: string
	artistURL: string
	albumURL?: string
	albumName?: string | null
	albumSlug: string
	images?: BandcampImage[]
	duration?: number
	trackNumber?: number
	audioSources?: BandcampAudioSource[]
}

export type BandcampFan$CollectionAlbum = {
	id: string
	type: 'album' | string
	url: string
	name: string
	artistName: string
	artistURL: string
	images?: BandcampImage[]
}

export type BandcampFan$CollectionArtist = {
	id: string
	type: 'artist' | 'label' | string
	url: string
	name: string
	location?: string | null
	images?: BandcampImage[]
}

export type BandcampFan$CollectionFan = {
	id: string
	type: 'fan' | string
	url: string
	name: string
	location?: string | null
	images?: BandcampImage[]
}
