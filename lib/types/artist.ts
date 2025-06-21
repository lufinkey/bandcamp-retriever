import type {
	BandcampImage,
	BandcampItemType,
	BandcampLink
} from './common';

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
