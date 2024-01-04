
import {
	Bandcamp,
	BandcampMediaType,
	BandcampMediaTypes } from '../lib';
import {
	FlagOptions,
	OutputFormat,
	OutputFormats,
	convertObjectToOutputFormat,
	parseArgs,
	parseBooleanArgValue } from './cmdutils';

type URLInfo = {
	url: string,
	mediaType: BandcampMediaType | undefined
};

function validateAndAppendURL(urls: URLInfo[], url: string, mediaType: BandcampMediaType | undefined): boolean {
	// TODO validate URL
	urls.push({
		url: url,
		mediaType: mediaType
	});
	return true;
}

export async function infoCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let pendingMediaType: BandcampMediaType | undefined = undefined;
	let concurrent = false;
	let continueOnFailure: boolean | undefined = undefined;
	let outputFormat = 'readable' as OutputFormat;
	let outputURLs = false;
	const urls: URLInfo[] = [];
	
	// parse arguments
	const mediaTypeOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): BandcampMediaType => {
			if(BandcampMediaTypes.indexOf(val) == -1) {
				throw new Error(`Invalid media type ${val}`);
			}
			return val as BandcampMediaType;
		},
		onRead: (flag, val: BandcampMediaType) => {
			if(pendingMediaType) {
				console.warn(`specified media type ${val} will override previously specified media type ${pendingMediaType}`);
			}
			pendingMediaType = val;
		}
	};
	const parseArgsResult = parseArgs(argv, argi, {
		longFlags: {
			'concurrent': {
				value: 'optional',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { concurrent = val ?? true; }
			},
			'continue-on-fail': {
				value: 'optional',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { continueOnFailure = val ?? true; }
			},
			'output-urls': {
				value: 'required',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { outputURLs = val ?? true; }
			},
			'output-format': {
				value: 'required',
				parseValue: (val): OutputFormat => {
					if(OutputFormats.indexOf(val) == -1) {
						throw new Error(`Invalid output format ${val}`);
					}
					return val as OutputFormat;
				},
				onRead: (flag, val) => { outputFormat = val; }
			},
			'media-type': mediaTypeOpts
		},
		shortFlags: {
			't': mediaTypeOpts
		},
		stopAfterDoubleDash: true,
		stopAfterSingleDash: true,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			if(validateAndAppendURL(urls, arg, pendingMediaType)) {
				pendingMediaType = undefined;
			}
		}
	});
	// parse remaining URLs with the same pending media type
	argi = parseArgsResult.argIndex;
	if(argi < argv.length) {
		while(argi < argv.length) {
			const arg = argv[argi];
			validateAndAppendURL(urls, arg, pendingMediaType);
		}
	} else if(pendingMediaType) {
		if(urls.length == 1 && !urls[0].mediaType) {
			urls[0].mediaType = pendingMediaType;
		} else {
			throw new Error("media type argument must be specified before a URL");
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
		outputURLs: boolean,
		outputFormat: OutputFormat,
		verbose: boolean
	} = {
		outputURLs,
		outputFormat,
		verbose: options.verbose
	};
	if(concurrent) {
		// fetch all items at once
		const itemPromises = urls.map((urlInfo) => {
			return bandcamp.getItemFromURL(urlInfo.url, {
				forceType: urlInfo.mediaType
			});
		});

		// output items
		for(let i=0; i<itemPromises.length; i++) {
			const url = urls[i].url;
			const itemPromise = itemPromises[i];
			const success = await outputItemResult(url, itemPromise, itemOpts);
			if(success) {
				successCount++;
			} else {
				failureCount++;
			}
		}
	} else {
		// fetch items one by one
		for(let i=0; i<urls.length; i++) {
			const urlInfo = urls[i];
			const itemPromise = bandcamp.getItemFromURL(urlInfo.url, {
				forceType: urlInfo.mediaType
			});
			const success = await outputItemResult(urlInfo.url, itemPromise, itemOpts);
			if(success) {
				successCount++;
			} else if(!continueOnFailure) {
				process.exit(2);
			} else {
				failureCount++;
			}
		}
	}

	// output result and exit if failures
	if(failureCount > 0) {
		console.error(`Finished with ${failureCount} failure${(failureCount > 1 ? 's' : '')}`);
		process.exit(2);
	}
}



async function outputItemResult(url: string, itemPromise: Promise<any>, options: { outputURLs: boolean, outputFormat: OutputFormat, verbose: boolean }): Promise<boolean> {
	let item: any;
	try {
		item = await itemPromise;
	} catch(error: any) {
		// output error
		let prefix: string = '';
		if(options.outputURLs) {
			if(options.outputFormat == 'readable') {
				prefix = `${url} :\n`;
			} else {
				prefix = `// ${url}\n`;
			}
		}
		console.log(`${prefix}null`);
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		console.log();
		return false;
	}
	// output result
	let prefix: string = '';
	if(options.outputURLs) {
		if(options.outputFormat == 'readable') {
			prefix = `${url} :\n`;
		} else {
			prefix = `// ${url}\n`;
		}
	}
	const objOutput = convertObjectToOutputFormat(item, options.outputFormat);
	console.log(`${prefix}${objOutput}\n`);
	return true;
}
