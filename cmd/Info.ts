
import {
	Bandcamp,
	BandcampMediaType,
	BandcampMediaTypes } from '../lib';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

type URLInfo = {
	url: string,
	mediaType: BandcampMediaType | undefined
};

export async function infoCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let pendingURLOptions: { mediaType?: (BandcampMediaType | undefined) } = {};
	let concurrent = false;
	let continueOnFailure: boolean | undefined = undefined;
	let printFormat = 'readable-brief' as PrintFormat;
	let printURLs = false;
	const urls: URLInfo[] = [];
	
	// parse arguments
	const urlFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val) => {
			validateAndAppendURL(urls, val, pendingURLOptions.mediaType);
			pendingURLOptions = {};
		}
	};
	const mediaTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): BandcampMediaType => {
			if(BandcampMediaTypes.indexOf(val) == -1) {
				throw new Error(`Invalid media type ${val}`);
			}
			return val as BandcampMediaType;
		},
		onRead: (flag, val: BandcampMediaType) => {
			if(urls.length == 0) {
				if(pendingURLOptions.mediaType) {
					throw new Error("Cannot specify multiple media types");
				}
				pendingURLOptions.mediaType = val;
			} else {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				if(urlInfo.mediaType) {
					throw new Error(`Cannot specify multiple media types for URL ${urlInfo.url}`);
				}
				urlInfo.mediaType = val;
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
			'media-type': mediaTypeFlagOpts
		},
		shortFlags: {
			'u': urlFlagOpts,
			't': mediaTypeFlagOpts
		},
		recognizeDoubleDash: true,
		stopAfterDoubleDash: true,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			validateAndAppendURL(urls, arg, pendingURLOptions.mediaType);
			pendingURLOptions = {};
		}
	});
	// if there are any remaining arguments, parsing was stopped at a -- argument, so parse the rest as URLs
	argi = parseArgsResult.argIndex;
	if(argi < argv.length) {
		while(argi < argv.length) {
			const arg = argv[argi];
			validateAndAppendURL(urls, arg, pendingURLOptions.mediaType);
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
				forceType: urlInfo.mediaType
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
				forceType: urlInfo.mediaType
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



function validateAndAppendURL(urls: URLInfo[], url: string, mediaType: BandcampMediaType | undefined) {
	// TODO validate URL
	urls.push({
		url: url,
		mediaType: mediaType
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
