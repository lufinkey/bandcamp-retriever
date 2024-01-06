
import {
	Bandcamp,
	BandcampMediaType,
	BandcampMediaTypes } from '../lib';
import { BandcampFan$APICollectionPage, BandcampFan$APIFollowedArtistPage, BandcampFan$APIFollowedFanPage, BandcampFan$APIWishlistPage } from '../lib/types';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	parseIntegerArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

type CollectionType = 'collection' | 'wishlist' | 'following-artists' | 'following-fans' | 'followers';
const CollectionTypes = [ 'collection', 'wishlist', 'following-artists', 'following-fans', 'followers' ];

export async function collectionCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let printFormat = 'readable-brief' as PrintFormat;
	let profileId: (string | undefined) = undefined;
	let collectionType: (CollectionType | undefined) = undefined as (CollectionType | undefined);
	let limit: (number | undefined) = undefined;
	let olderThanToken: (string | undefined) = undefined;

	// get profile argument
	if(argi >= argv.length) {
		throw new Error("Missing profile argument");
	}
	const profile = argv[argi];
	argi++;
	
	// parse arguments
	const profileIdFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val) => {
			if(profileId) {
				throw new Error("Cannot specify multiple profile IDs");
			}
			profileId = val;
		}
	};
	const collectionTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): CollectionType => {
			if(CollectionTypes.indexOf(val) == -1) {
				throw new Error(`Invalid collection type ${val}`);
			}
			return val as CollectionType;
		},
		onRead: (flag, val: CollectionType) => {
			if(collectionType) {
				throw new Error("Cannot specify multiple collection types");
			}
			collectionType = val;
		}
	};
	const limitFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: parseIntegerArgValue,
		onRead: (flag, val: number) => {
			if(limit != null) {
				throw new Error("Cannot specify multiple limit arguments");
			}
			limit = val;
		}
	};
	const olderThanTokenOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val) => {
			if(olderThanToken != null) {
				throw new Error("Cannot specify multiple older-than-token arguments");
			}
			olderThanToken = val;
		}
	};
	const parseArgsResult = parseArgs(argv, argi, {
		longFlags: {
			'print-format': {
				value: 'required',
				parseValue: (val): PrintFormat => {
					if(PrintFormats.indexOf(val) == -1) {
						throw new Error(`Invalid output format ${val}`);
					}
					return val as PrintFormat;
				},
				onRead: (flag, val) => { printFormat = val; }
			},
			'profile-id': profileIdFlagOpts,
			'collection': collectionTypeFlagOpts,
			'limit': limitFlagOpts,
			'older-than-token': olderThanTokenOpts
		},
		shortFlags: {
			'i': profileIdFlagOpts,
			'c': collectionTypeFlagOpts,
			'l': limitFlagOpts,
			'p': olderThanTokenOpts
		},
		recognizeDoubleDash: true,
		stopAfterDoubleDash: true,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			throw new Error(`Unrecognized argument ${arg}`);
		}
	});
	// convert username to a URL if needed
	let profileURL: string;
	if(!isURLString(profile)) {
		if(profile.indexOf('/') != -1 || profile.indexOf('?') != -1) {
			throw new Error(`Invalid profile ${profile}`);
		}
		profileURL = `https://bandcamp.com/${profile}`;
	} else {
		profileURL = profile;
	}

	// get fan profile ID if needed
	if(!profileId) {
		const fan = await bandcamp.getFan(profileURL, {
			fetchAdditionalData: false
		});
		if(!fan.id) {
			console.error(`Failed to fetch ID from fan URL ${profileURL}`);
			process.exit(2);
		}
		profileId = fan.id;
	}

	// fetch collection page
	let results: (BandcampFan$APICollectionPage | BandcampFan$APIWishlistPage | BandcampFan$APIFollowedArtistPage | BandcampFan$APIFollowedFanPage);
	try {
		switch(collectionType) {
			case undefined:
			case 'collection':
				results = await bandcamp.getFanCollectionItems(profileURL, profileId, {
					olderThanToken: olderThanToken,
					count: limit
				});
				break;

			case 'wishlist':
				results = await bandcamp.getFanWishlistItems(profileURL, profileId, {
					olderThanToken: olderThanToken,
					count: limit
				});
				break;

			case 'following-artists':
				results = await bandcamp.getFanFollowingArtists(profileURL, profileId, {
					olderThanToken: olderThanToken,
					count: limit
				});
				break;

			case 'following-fans':
				results = await bandcamp.getFanFollowingFans(profileURL, profileId, {
					olderThanToken: olderThanToken,
					count: limit
				});
				break;

			case 'followers':
				results = await bandcamp.getFanFollowers(profileURL, profileId, {
					olderThanToken: olderThanToken,
					count: limit
				});
				break;

			default:
				console.error(`Invalid collection type '${collectionType}'`);
				process.exit(1);
		}
	} catch(error: any) {
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		process.exit(2);
	}

	// print collection page
	console.log(convertObjectToPrintFormat(results, printFormat, {
		readable: {
			arrayEntryLimitDepth: 3
		}
	}));
}


function isURLString(url: string) {
	if(url.indexOf(':') != -1) {
		return true;
	}
	let urlObj: URL;
	try {
		urlObj = new URL(url);
	} catch(error) {
		return false;
	}
	if(urlObj.hostname || urlObj.pathname.startsWith('/')) {
		return true;
	}
	return false;
}
