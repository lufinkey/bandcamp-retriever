
import type {
	PrivBandcampFanFeed$Band,
	PrivBandcampFanFeed$Fan,
	PrivBandcampFanFeed$Story,
	PrivBandcampFanFeed$StoryCollector,
	PrivBandcampFanFeed$Track
} from './fanFeed';

// FAN DASH FEED UPDATES AJAX

export type PrivBandcampAPI$FanDashFeedUpdates = {
	ok: boolean;
	stories: {
		entries: PrivBandcampFanFeed$Story[];
		oldest_story_date: number;
		newest_story_date: number;
		track_list: PrivBandcampFanFeed$Track[];
		query_times: {
			followee_lookup: number;
			followee_purchases: number;
			candidate_tralbums: number;
			nonfollowee_lookup: number;
			new_follower_lookup: number;
			artist_messages_lookup: number;
			new_releases_lookup: number;
			fan_basic_details: number;
			fan_common_items: number;
			collection_images: number;
			band_basic_details: number;
			band_following_details: number;
			total: number;
		};
		feed_timestamp: number | null;
	};
	fan_info: {
		[fanId: string]: PrivBandcampFanFeed$Fan;
	};
	band_info: {
		[bandId: string]: PrivBandcampFanFeed$Band;
	};
	story_collectors: {
		[collectorId: string]: PrivBandcampFanFeed$StoryCollector;
	};
	item_lookup: {
		[itemId: string]: {
			item_type: ('a' | 't' | string);
			purchased: boolean;
		}
	};
};
