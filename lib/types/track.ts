import type {
	BandcampAudioFileType,
	BandcampImage,
	BandcampItemType
} from './common';
import type { BandcampArtist } from './artist';

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
