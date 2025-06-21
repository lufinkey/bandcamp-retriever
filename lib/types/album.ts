import { BandcampArtist } from './artist';
import type {
	BandcampImage,
	BandcampItemType
} from './common';
import type {
	BandcampAudioSource
} from './track';

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
