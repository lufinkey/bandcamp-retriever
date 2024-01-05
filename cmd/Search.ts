import {
	Bandcamp,
	BandcampMediaType,
	BandcampMediaTypes,
	BandcampMediaTypeChar } from '../lib';
import { BandcampSearchResultsList } from '../lib/types';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	parseIntegerArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

const SearchableMediaTypes: { [key: (BandcampMediaType | 'any' | string)]: (BandcampMediaTypeChar | undefined) } = {
	'any': undefined,
	'album': 'a',
	'artist': 'b',
	'label': 'b',
	'track': 't',
	'fan': 'f'
};

export async function searchCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let printFormat = 'readable-brief' as PrintFormat;
	let mediaType: (BandcampMediaType | 'any' | undefined) = undefined;
	let page: (number | undefined) = undefined;
	let query: (string | undefined) = undefined;
	let queryGivenWithFlag = false;
	
	// parse arguments
	const mediaTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): (BandcampMediaType | 'any') => {
			if(val != 'any' && BandcampMediaTypes.indexOf(val) == -1) {
				throw new Error(`Invalid media type ${val}`);
			}
			return val as (BandcampMediaType | 'any');
		},
		onRead: (flag, val: (BandcampMediaType | 'any')) => {
			if(mediaType != null) {
				console.warn(`specified media type ${val} will override previously specified media type ${mediaType}`);
			}
			mediaType = val;
		}
	};
	const pageFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: parseIntegerArgValue,
		onRead: (flag, val: number) => {
			if(page != null) {
				console.warn(`specified page ${val} will override previously specified page ${page}`);
			}
			page = val;
		}
	};
	const queryFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val: string) => {
			if(query != null) {
				if(!queryGivenWithFlag) {
					throw new Error(`Multiple queries given with and without query flag`);
				}
				console.warn(`specified query '${val}' will override previously specified query '${query}'`);
			}
			query = val;
			queryGivenWithFlag = true;
		}
	};
	parseArgs(argv, argi, {
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
			'media-type': mediaTypeFlagOpts,
			'page': pageFlagOpts,
			'query': queryFlagOpts
		},
		shortFlags: {
			't': mediaTypeFlagOpts,
			'p': pageFlagOpts,
			'q': queryFlagOpts
		},
		recognizeDoubleDash: false,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			if(query != null) {
				throw new Error(`ignoring unrecognized argument ${arg}`);
			}
			query = arg;
			queryGivenWithFlag = false;
		}
	});

	// validate parameters
	if(query == null) {
		throw new Error("No search query was given");
	}
	let searchItemType: BandcampMediaTypeChar | undefined = undefined;
	if(mediaType) {
		searchItemType = SearchableMediaTypes[mediaType];
	}

	// perform search
	let result: BandcampSearchResultsList;
	try {
		result = await bandcamp.search(query, {
			item_type: searchItemType,
			page: page
		});
	} catch(error: any) {
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		process.exit(2);
	}
	
	// output search results
	console.log(convertObjectToPrintFormat(result, printFormat, {
		readable: {
			arrayEntryLimitDepth: 2
		}
	}));
}
