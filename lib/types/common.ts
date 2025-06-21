import type { PrivBandcampAudioFileType } from './private/common';

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
