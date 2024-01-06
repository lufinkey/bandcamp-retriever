
import {
	Bandcamp,
	BandcampItemType,
	BandcampItemTypes } from '../lib';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

type URLInfo = {
	url: string,
	itemType?: BandcampItemType | undefined
	additionalData?: (boolean | undefined),
	additionalPages?: (boolean | undefined)
};

export async function infoCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let pendingURLOptions: {
		itemType?: (BandcampItemType | undefined),
		additionalData?: (boolean | undefined),
		additionalPages?: (boolean | undefined)
	} = {};
	let concurrent = false;
	let continueOnFailure: boolean | undefined = undefined;
	let printFormat = 'readable-brief' as PrintFormat;
	let printURLs = false;
	const urls: URLInfo[] = [];
	
	// parse arguments
	const urlFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val) => {
			validateAndAppendURL(urls, val, pendingURLOptions);
			pendingURLOptions = {};
		}
	};
	const itemTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): BandcampItemType => {
			if(BandcampItemTypes.indexOf(val) == -1) {
				throw new Error(`Invalid item type ${val}`);
			}
			return val as BandcampItemType;
		},
		onRead: (flag, val: BandcampItemType) => {
			if(urls.length == 0) {
				if(pendingURLOptions.itemType) {
					throw new Error("Cannot specify multiple item types");
				}
				pendingURLOptions.itemType = val;
			} else {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				if(urlInfo.itemType) {
					throw new Error(`Cannot specify multiple item types for URL ${urlInfo.url}`);
				}
				urlInfo.itemType = val;
			}
		}
	};
	const additionalDataFlagOpts: FlagOptions = {
		value: 'optional',
		parseValue: parseBooleanArgValue,
		onRead: (flag, val) => {
			if(urls.length == 0) {
				pendingURLOptions.additionalData = val;
			} else {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				urlInfo.additionalData = val;
			}
		}
	};
	const additionalPagesFlagOpts: FlagOptions = {
		value: 'optional',
		parseValue: parseBooleanArgValue,
		onRead: (flag, val) => {
			if(urls.length == 0) {
				pendingURLOptions.additionalPages = val;
			} else {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				urlInfo.additionalPages = val;
			}
		}
	};
	const parseArgsResult = parseArgs(argv, argi, {
		longFlags: {
			/*'concurrent': {
				value: 'optional',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { concurrent = val ?? true; }
			},*/
			'continue-on-fail': {
				value: 'optional',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { continueOnFailure = val ?? true; }
			},
			'print-urls': {
				value: 'required',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { printURLs = val ?? true; }
			},
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
			'url': urlFlagOpts,
			'type': itemTypeFlagOpts,
			'additional-data': additionalDataFlagOpts,
			'additional-pages': additionalPagesFlagOpts
		},
		shortFlags: {
			'u': urlFlagOpts,
			't': itemTypeFlagOpts,
			'z': additionalDataFlagOpts
		},
		recognizeDoubleDash: true,
		stopAfterDoubleDash: true,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			validateAndAppendURL(urls, arg, pendingURLOptions);
			pendingURLOptions = {};
		}
	});
	// if there are any remaining arguments, parsing was stopped at a -- argument, so parse the rest as URLs
	argi = parseArgsResult.argIndex;
	if(argi < argv.length) {
		while(argi < argv.length) {
			const arg = argv[argi];
			validateAndAppendURL(urls, arg, pendingURLOptions);
		}
	}
	if(continueOnFailure === undefined) {
		continueOnFailure = false;
	}
	else if(continueOnFailure === false && concurrent) {
		console.warn("fetching will not stop on failure because the concurrent flag is set");
	}
	// ensure URLs were given
	if(urls.length == 0) {
		throw new Error("Atleast 1 URL must be given");
	}
	
	// perform info lookup
	let successCount = 0;
	let failureCount = 0;
	const itemOpts: {
		printURLs: boolean,
		printFormat: PrintFormat,
		verbose: boolean
	} = {
		printURLs,
		printFormat,
		verbose: options.verbose
	};
	if(concurrent) {
		// fetch all items at once
		const itemPromises = urls.map((urlInfo) => {
			return bandcamp.getItemFromURL(urlInfo.url, {
				forceType: urlInfo.itemType,
				fetchAdditionalData: urlInfo.additionalData,
				fetchAdditionalPages: urlInfo.additionalPages ?? false
			});
		});
		for(let i=0; i<itemPromises.length; i++) {
			const url = urls[i].url;
			const itemPromise = itemPromises[i];
			const success = await printItemResult(url, itemPromise, itemOpts);
			if(success) {
				successCount++;
			} else {
				failureCount++;
			}
			if(i != (itemPromises.length - 1)) {
				console.log();
			}
		}
	} else {
		// fetch items one by one
		for(let i=0; i<urls.length; i++) {
			const urlInfo = urls[i];
			const itemPromise = bandcamp.getItemFromURL(urlInfo.url, {
				forceType: urlInfo.itemType,
				fetchAdditionalData: urlInfo.additionalData,
				fetchAdditionalPages: urlInfo.additionalPages ?? false
			});
			const success = await printItemResult(urlInfo.url, itemPromise, itemOpts);
			if(success) {
				successCount++;
			} else if(!continueOnFailure) {
				process.exit(2);
			} else {
				failureCount++;
			}
			if(i != (urls.length - 1)) {
				console.log();
			}
		}
	}

	// output result and exit if failures
	if(failureCount > 0) {
		process.stderr.write(`Finished with ${failureCount} failure${(failureCount > 1 ? 's' : '')}\n`);
		process.exit(2);
	}
}



function validateAndAppendURL(urls: URLInfo[], url: string, options: {
	itemType?: BandcampItemType | undefined,
	additionalData?: boolean | undefined,
	additionalPages?: boolean | undefined
}) {
	// TODO validate URL
	urls.push({
		...options,
		url: url
	});
}

async function printItemResult(url: string, itemPromise: Promise<any>, options: { printURLs: boolean, printFormat: PrintFormat, verbose: boolean }): Promise<boolean> {
	let item: any;
	try {
		item = await itemPromise;
	} catch(error: any) {
		// print error
		let prefix: string = '';
		if(options.printURLs) {
			if(options.printFormat.startsWith('json')) {
				console.error(`// ${url}`);
			} else {
				console.error(prefix = `${url} :`);
			}
		}
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		return false;
	}
	// print result
	let prefix: string = '';
	if(options.printURLs) {
		if(options.printFormat.startsWith('json')) {
			prefix = `// ${url}\n`;
		} else {
			prefix = `${url} :\n`;
		}
	}
	const objOutput = convertObjectToPrintFormat(item, options.printFormat);
	console.log(`${prefix}${objOutput}`);
	return true;
}
