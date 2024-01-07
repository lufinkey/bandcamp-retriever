import {
	Bandcamp,
	BandcampItemType,
	BandcampItemTypes,
	BandcampItemTypeChar,
	BandcampSearchResultsList } from '../lib';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	parseIntegerArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

const SearchableItemTypes: { [key: (BandcampItemType | 'any' | string)]: (BandcampItemTypeChar | undefined) } = {
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
	let itemType: (BandcampItemType | 'any' | undefined) = undefined;
	let page: (number | undefined) = undefined;
	let queryGivenWithFlag = false;

	// get query argument
	if(argi >= argv.length) {
		throw new Error("Missing profile argument");
	}
	const query = argv[argi];
	argi++;
	
	// parse arguments
	const itemTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): (BandcampItemType | 'any') => {
			if(val != 'any' && BandcampItemTypes.indexOf(val) == -1) {
				throw new Error(`Invalid item type ${val}`);
			}
			return val as (BandcampItemType | 'any');
		},
		onRead: (flag, val: (BandcampItemType | 'any')) => {
			if(itemType != null) {
				throw new Error("Cannot specify item type multiple times");
			}
			itemType = val;
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
			'type': itemTypeFlagOpts,
			'page': pageFlagOpts,
		},
		shortFlags: {
			't': itemTypeFlagOpts,
			'p': pageFlagOpts
		},
		recognizeDoubleDash: false,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			throw new Error(`Unrecognized argument ${arg}`);
		}
	});

	// validate parameters
	if(query == null) {
		throw new Error("No search query was given");
	}
	let searchItemType: BandcampItemTypeChar | undefined = undefined;
	if(itemType) {
		searchItemType = SearchableItemTypes[itemType];
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
