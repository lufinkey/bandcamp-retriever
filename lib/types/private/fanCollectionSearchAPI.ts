
import type { PrivBandcampAudioFileType } from './common'
import type { PrivBandcampAPI$Fan$CollectionMediaItem } from './fanCollectionAPI'

// https://bandcamp.com/api/fancollection/1/search_items
//  Referer: <FAN URL>/wishlist
export type PrivBandcampAPI$Fan$SearchItemsResult = {
	tralbums: PrivBandcampAPI$Fan$CollectionMediaItem[],
	gifts: any[],
	tracklists: {
		// map of item IDs to their (partial) tracklists
		[id: string]: {
			id: number,
			title: string,
			artist: string,
			track_number: number | null,
			duration: number,
			file: {
				// map of audio file types to URLs
				[filetype: (PrivBandcampAudioFileType | string)]: string
			}
		}[]
	},
	redownload_urls: {},
	similar_gift_ids: any[],
	item_lookup: {
		// map of item IDs to their types and purchased states
		[id: string]: {
			item_type: 't' | 'a' | string,
			purchased: boolean
		}
	},
	search_key: string // the search term
}
