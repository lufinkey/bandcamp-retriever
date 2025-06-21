import type { BandcampImage } from '../types'

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
