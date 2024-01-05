
import path from 'path';
import fs from 'fs';
import https from 'https';
import {
	Bandcamp,
	BandcampTrack,
	BandcampAlbumTrack } from "../lib";
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue } from "./cmdutils";
import { resolveFormatString } from './formatstring';

type DownloadableMediaType = 'track' | 'album';
const DownloadableMediaTypes = [ 'track', 'album' ];

const DefaultOutputStructure = '%(artistName)/%(albumName)/%(trackNumber) %(name).%(fileExt)';

type URLInfo = {
	url: string,
	mediaType?: DownloadableMediaType,
	dir?: string,
	output?: string
};

export async function downloadCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let pendingURLOptions: {
		mediaType?: DownloadableMediaType
	} = {};
	const sharedURLOptions: {
		dir?: string,
		output?: string
	} = {};
	let continueOnFailure: boolean | undefined = undefined;
	const urls: URLInfo[] = [];
	
	// parse arguments
	const mediaTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): DownloadableMediaType => {
			if(DownloadableMediaTypes.indexOf(val) == -1) {
				throw new Error(`Invalid media type ${val}`);
			}
			return val as DownloadableMediaType;
		},
		onRead: (flag, val: DownloadableMediaType) => {
			if(urls.length == 0) {
				if(pendingURLOptions.mediaType) {
					console.warn(`specified media type ${val} will override previously specified media type ${pendingURLOptions.mediaType}`);
				}
				pendingURLOptions.mediaType = val;
			} else {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				if(urlInfo.mediaType) {
					console.warn(`specified media type ${val} will override previously specified media type ${urlInfo.mediaType}`);
				}
				urlInfo.mediaType = val;
			}
		}
	};
	const dirFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val: string) => {
			if(urls.length > 0) {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				urlInfo.dir = val;
				// upply to previous if not set
				for(let i=(lastIndex-1); i>=0; i--) {
					const otherURLInfo = urls[i];
					if(otherURLInfo.dir != null) {
						break;
					}
					otherURLInfo.dir = val;
				}
			}
			sharedURLOptions.dir = val;
		}
	};
	const outputFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val: string) => {
			if(urls.length > 0) {
				const lastIndex = urls.length - 1;
				const urlInfo = urls[lastIndex];
				urlInfo.output = val;
				// upply to previous if not set
				for(let i=(lastIndex-1); i>=0; i--) {
					const otherURLInfo = urls[i];
					if(otherURLInfo.output != null) {
						break;
					}
					otherURLInfo.output = val;
				}
			}
			sharedURLOptions.output = val;
		}
	};
	const parseArgsResult = parseArgs(argv, argi, {
		longFlags: {
			'continue-on-fail': {
				value: 'optional',
				parseValue: parseBooleanArgValue,
				onRead: (flag, val) => { continueOnFailure = val ?? true; }
			},
			'media-type': mediaTypeFlagOpts,
			'dir': dirFlagOpts,
			'output': outputFlagOpts
		},
		shortFlags: {
			't': mediaTypeFlagOpts,
			'd': dirFlagOpts,
			'o': outputFlagOpts
		},
		stopAfterDoubleDash: true,
		stopAfterSingleDash: true,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			if(validateAndAppendURL(urls, { ...sharedURLOptions, ...pendingURLOptions, url:arg })) {
				pendingURLOptions = {};
			}
		}
	});
	// parse remaining URLs with the same pending media type
	argi = parseArgsResult.argIndex;
	if(argi < argv.length) {
		while(argi < argv.length) {
			const arg = argv[argi];
			validateAndAppendURL(urls, { ...sharedURLOptions, ...pendingURLOptions, url:arg });
		}
	}
	// ensure URLs were given
	if(urls.length == 0) {
		throw new Error("Atleast 1 URL must be given");
	}
	
	// perform info lookup
	let successCount = 0;
	let failureCount = 0;
	// fetch items one by one
	const opts = {
		...options,
		continueOnFailure
	};
	for(const urlInfo of urls) {
		const result = await downloadMedia(bandcamp, urlInfo, opts);
		successCount += result.successCount;
		failureCount += result.failureCount;
		if(failureCount > 0 && !continueOnFailure) {
			process.exit(1);
		}
	}

	// output result and exit if failures
	if(failureCount > 0) {
		console.error(`Finished with ${failureCount} failure${(failureCount > 1 ? 's' : '')}`);
		process.exit(2);
	}
}



function validateAndAppendURL(urls: URLInfo[], urlInfo: URLInfo): boolean {
	// TODO validate URL
	urls.push(urlInfo);
	return true;
}

async function downloadMedia(bandcamp: Bandcamp, urlInfo: URLInfo, options: { verbose: boolean, continueOnFailure?: boolean }): Promise<{ successCount: number, failureCount: number }> {
	// get media info
	let mediaInfo;
	try {
		mediaInfo = await bandcamp.getItemFromURL(urlInfo.url, {
			forceType: urlInfo.mediaType
		});
	} catch(error: any) {
		console.error(`Failed to download metadata from ${urlInfo.url}`);
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		return { successCount: 0, failureCount: 1 };
	}
	// ensure item is a track or album
	let successCount = 0;
	let failureCount = 0;
	if(mediaInfo.type == 'track') {
		// download single track
		return await downloadTracks(urlInfo, [mediaInfo], options);
	} else if(mediaInfo.type == 'album') {
		// download tracks from album
		return await downloadTracks(urlInfo, mediaInfo.tracks, options);
	} else {
		console.error(`Unknown media type ${mediaInfo.type} for url ${urlInfo.url}`);
		failureCount++;
	}
	return { successCount, failureCount };
}

async function downloadTracks(urlInfo: URLInfo, tracks: (BandcampTrack | BandcampAlbumTrack)[], options: { verbose: boolean, continueOnFailure?: boolean }): Promise<{ successCount: number, failureCount: number }> {
	let successCount = 0;
	let failureCount = 0;
	for(const track of tracks) {
		try {
			await downloadTrack(urlInfo, track);
		} catch(error: any) {
			console.error(`Failed to download audio for track ${track.url}`);
			if(error && error.message && !options.verbose) {
				console.error(error.message);
			} else {
				console.error(error);
			}
			failureCount++;
			if(!options.continueOnFailure) {
				break;
			}
		}
	}
	return { successCount, failureCount };
}

async function downloadTrack(urlInfo: URLInfo, track: (BandcampTrack | BandcampAlbumTrack)) {
	// check for available audio source
	if(!track.audioSources || track.audioSources.length === 0) {
		throw new Error(`No audio sources available for track ${track.url}`);
	}
	const audioSource = track.audioSources[0];
	// resolve output path
	let filepath: string = '.';
	if(urlInfo.dir != null) {
		filepath = path.resolve(filepath, urlInfo.dir);
	}
	const outputStructure = urlInfo.output ?? DefaultOutputStructure;
	filepath = path.resolve(filepath, resolveFormatString(outputStructure, { fileExt: 'mp3', ...track }));
	// download the file
	console.log(`Downloading audio for track ${track.url} to path ${filepath}`);
	await downloadFile(audioSource.url, filepath);
	console.log("Done");
}

function downloadFile(url: string, filepath: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		https.get(url, (res) => {
			if(res.statusCode != null && (res.statusCode < 200 || res.statusCode >= 300)) {
				reject(new Error(res.statusMessage ?? `Failed with status ${res.statusCode}`));
				return;
			}
			// open file stream
			let file: fs.WriteStream;
			try {
				file = fs.createWriteStream(filepath);
			} catch(error) {
				reject(error);
				return;
			}
			file.on('open', () => {
				// write until finished
				res.pipe(file);
				// close the file when finished
				file.on('finish', () => {
					file.close();
					resolve();
				});
			});
			file.on('error', (error) => {
				reject(error);
			});
		}).on('error', reject);
	});
}
