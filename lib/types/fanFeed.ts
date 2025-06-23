import type {
	BandcampImage,
	BandcampItemType
} from './common'
import type {
	BandcampAudioSource
} from './track'

export type BandcampFanFeedPage = {
	oldestStoryDate: number
	newestStoryDate: number
	stories: BandcampFanFeed$Story[]
}

export type BandcampFanFeed$Item = BandcampFanFeed$Track | BandcampFanFeed$Album;

export type BandcampFanFeed$Story = {
	type: BandcampFanFeed$StoryType
	date: string
	why?: string | null
	fan: BandcampFanFeed$Fan
	item?: BandcampFanFeed$Item
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
