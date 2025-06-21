import type { BandcampItemType } from '../types'

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
