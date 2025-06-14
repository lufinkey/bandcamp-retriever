
import {
	Bandcamp,
	BandcampTrack,
	BandcampAlbumTrack,
	BandcampAudioFileType,
	BandcampAudioSource,
	BandcampItemType } from '../lib';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	parseIntegerArgValue } from './cmdutils';
import {
	popAudioSourceOfType,
	popHighestPriorityAudioSource } from '../lib/media_utils';

type DownloadableItemType = BandcampItemType.Track | BandcampItemType.Album;
const DownloadableItemTypes: DownloadableItemType[] = [
	BandcampItemType.Track,
	BandcampItemType.Album
];

const DefaultFileTypePriorityList = [
	'flac',
	'aiff-lossless',
	'vorbis',
	'aac-hi',
	'wav',
	'alac',
	'mp3-v0',
	'mp3-320',
	'mp3-128'
];
const DefaultFileTypePriorities: { [key: (BandcampAudioFileType | string)]: number } = {}
for(let i=0; i<DefaultFileTypePriorityList.length; i++) {
	DefaultFileTypePriorities[DefaultFileTypePriorityList[i]] = i;
}

type URLInfo = {
	url: string,
	itemType?: DownloadableItemType,
	dir?: string,
	output?: string,
	fileTypes?: (BandcampAudioFileType | string)[],
	preferFileTypes?: (BandcampAudioFileType | string)[],
	maxFilesPerTrack?: number
};

export async function downloadCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	// set defaults for options
	let pendingURLOptions: {
		itemType?: DownloadableItemType
	} = {};
	const sharedURLOptions: {
		dir?: string,
		output?: string,
		fileTypes?: string[],
		preferFileTypes?: string[],
		maxFilesPerTrack?: number
	} = {};
	let continueOnFailure: boolean | undefined = undefined;
	const urls: URLInfo[] = [];
	
	// parse arguments
	const urlFlagOpts: FlagOptions = {
		value: 'required',
		onRead: (flag, val) => {
			validateAndAppendURL(urls, { ...sharedURLOptions, ...pendingURLOptions, url:val });
			pendingURLOptions = {};
		}
	};
	const itemTypeFlagOpts: FlagOptions = {
		value: 'required',
		parseValue: (val): DownloadableItemType => {
			if(DownloadableItemTypes.indexOf(val as any) == -1) {
				throw new Error(`Invalid item type ${val}`);
			}
			return val as DownloadableItemType;
		},
		onRead: (flag, val: DownloadableItemType) => {
			if(urls.length == 0) {
				if(pendingURLOptions.itemType) {
					throw new Error(`Cannot specify multiple item types`);
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
			'url': urlFlagOpts,
			'type': itemTypeFlagOpts,
			'dir': dirFlagOpts,
			'output': outputFlagOpts,
			'file-type': {
				value: 'required',
				parseValue: (val) => val.split(',').map((t) => t.trim()),
				onRead: (flag, val: string[]) => {
					if(urls.length > 0) {
						const lastIndex = urls.length - 1;
						const urlInfo = urls[lastIndex];
						urlInfo.fileTypes = val;
						// upply to previous if not set
						for(let i=(lastIndex-1); i>=0; i--) {
							const otherURLInfo = urls[i];
							if(otherURLInfo.fileTypes != null) {
								break;
							}
							otherURLInfo.fileTypes = val;
						}
					}
					sharedURLOptions.fileTypes = val;
				}
			},
			'prefer-file-type': {
				value: 'required',
				parseValue: (val) => val.split(',').map((t) => t.trim()),
				onRead: (flag, val: string[]) => {
					if(urls.length > 0) {
						const lastIndex = urls.length - 1;
						const urlInfo = urls[lastIndex];
						urlInfo.preferFileTypes = val;
						// upply to previous if not set
						for(let i=(lastIndex-1); i>=0; i--) {
							const otherURLInfo = urls[i];
							if(otherURLInfo.preferFileTypes != null) {
								break;
							}
							otherURLInfo.preferFileTypes = val;
						}
					}
					sharedURLOptions.preferFileTypes = val;
				}
			},
			'max-files-per-track': {
				value: 'required',
				parseValue: parseIntegerArgValue,
				onRead: (flag, val: number) => {
					if(val <= 0) {
						throw new Error("Max files per track should be a number greater than 0");
					}
					if(urls.length > 0) {
						const lastIndex = urls.length - 1;
						const urlInfo = urls[lastIndex];
						urlInfo.maxFilesPerTrack = val;
						// upply to previous if not set
						for(let i=(lastIndex-1); i>=0; i--) {
							const otherURLInfo = urls[i];
							if(otherURLInfo.preferFileTypes != null) {
								break;
							}
							otherURLInfo.maxFilesPerTrack = val;
						}
					}
					sharedURLOptions.maxFilesPerTrack = val;
				}
			}
		},
		shortFlags: {
			'u': urlFlagOpts,
			't': itemTypeFlagOpts,
			'd': dirFlagOpts,
			'o': outputFlagOpts
		},
		recognizeDoubleDash: true,
		stopAfterDoubleDash: true,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			validateAndAppendURL(urls, { ...sharedURLOptions, ...pendingURLOptions, url:arg });
			pendingURLOptions = {};
		}
	});
	// if there are any remaining arguments, parsing was stopped at a -- argument, so parse the rest as URLs
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
		continueOnFailure: (continueOnFailure ?? false)
	};
	for(const urlInfo of urls) {
		const result = await downloadMedia(bandcamp, urlInfo, opts);
		successCount += result.successCount;
		failureCount += result.failureCount;
		if(failureCount > 0 && !continueOnFailure) {
			process.exit(2);
		}
	}

	// output result and exit if failures
	if(failureCount > 0) {
		console.error(`Finished with ${failureCount} failure${(failureCount > 1 ? 's' : '')}`);
		process.exit(2);
	}
}



function validateAndAppendURL(urls: URLInfo[], urlInfo: URLInfo) {
	// TODO validate URL
	urls.push(urlInfo);
}

type DownloadMediaOptions = {
	verbose: boolean,
	continueOnFailure: boolean
};

async function downloadMedia(bandcamp: Bandcamp, urlInfo: URLInfo, options: DownloadMediaOptions): Promise<{ successCount: number, failureCount: number }> {
	// get media info
	if(options.verbose) {
		process.stderr.write(`Fetching metadata for ${urlInfo.url}\n`);
	}
	let mediaItem;
	try {
		mediaItem = await bandcamp.getItemFromURL(urlInfo.url, {
			forceType: urlInfo.itemType
		});
	} catch(error: any) {
		console.error(`Failed to fetch metadata from ${urlInfo.url}`);
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		return { successCount: 0, failureCount: 1 };
	}
	if(options.verbose) {
		process.stderr.write(`Done fetching ${mediaItem.type} metadata for ${urlInfo.url}\n`);
	}
	// ensure item is a track or album
	let successCount = 0;
	let failureCount = 0;
	if(mediaItem.type == 'track') {
		// download single track
		return await downloadTracks(bandcamp, urlInfo, [mediaItem], options);
	} else if(mediaItem.type == 'album') {
		// download tracks from album
		return await downloadTracks(bandcamp, urlInfo, mediaItem.tracks, options);
	} else {
		console.error(`Unknown media type ${mediaItem.type} for url ${urlInfo.url}`);
		failureCount++;
	}
	return { successCount, failureCount };
}

async function downloadTracks(bandcamp: Bandcamp, urlInfo: URLInfo, tracks: (BandcampTrack | BandcampAlbumTrack)[], options: DownloadMediaOptions): Promise<{ successCount: number, failureCount: number }> {
	if(options.verbose) {
		process.stderr.write(`Downloading ${tracks.length} track${tracks.length == 1 ? '' : 's'} for ${urlInfo.url}\n`);
	}
	let successCount = 0;
	let failureCount = 0;
	for(const track of tracks) {
		const result = await downloadTrack(bandcamp, urlInfo, track, options);
		successCount += result.successCount;
		failureCount += result.failureCount;
		if(result.failureCount > 0 && !options.continueOnFailure) {
			break;
		}
	}
	return { successCount, failureCount };
}

async function downloadTrack(bandcamp: Bandcamp, urlInfo: URLInfo, track: (BandcampTrack | BandcampAlbumTrack), options: DownloadMediaOptions): Promise<{ successCount: number, failureCount: number }> {
	let successCount = 0;
	let failureCount = 0;
	// check for available audio source
	if(!track.audioSources || track.audioSources.length === 0) {
		console.error(`No audio sources available for track ${track.url}`);
		failureCount++;
		return { successCount, failureCount };
	}
	const audioSources = track.audioSources.slice(0);
	// build file type priorities
	const priorities: { [key: (BandcampAudioFileType | string)]: number } = {};
	let priorityEntryCount = 0;
	if(urlInfo.preferFileTypes != null) {
		for(let i=0; i<urlInfo.preferFileTypes.length; i++) {
			const fileType = urlInfo.preferFileTypes[i];
			if(!priorities[fileType]) {
				priorities[fileType] = i;
				priorityEntryCount++;
			}
		}
	}
	for(let i=0; i<DefaultFileTypePriorityList.length; i++) {
		const fileType = DefaultFileTypePriorityList[i];
		if(!priorities[fileType]) {
			priorities[fileType] = priorityEntryCount + i;
		}
	}
	// if file types are manually specified, download them one by one
	if(urlInfo.fileTypes != null && urlInfo.fileTypes.length > 0) {
		let downloadAll = false;
		for(let i=0; i<urlInfo.fileTypes.length; i++) {
			const fileType = urlInfo.fileTypes[i];
			if(fileType == 'all') {
				// download all remaining file types by priority order
				downloadAll = true;
				break;
			}
			let audioSrc: BandcampAudioSource | null;
			if(fileType == 'any') {
				audioSrc = popHighestPriorityAudioSource(audioSources, priorities);
			} else {
				audioSrc = popAudioSourceOfType(audioSources, fileType);
			}
			if(audioSrc) {
				const success = await downloadTrackAudioSource(bandcamp, urlInfo, track, audioSrc, options);
				if(success) {
					successCount++;
					if(urlInfo.maxFilesPerTrack != null && successCount >= urlInfo.maxFilesPerTrack) {
						// we've downloaded the maximum allowed files per track
						break;
					}
				} else {
					failureCount++;
					if(!options.continueOnFailure) {
						break;
					}
				}
			} else {
				if(fileType == 'any') {
					console.error(`Couldn't find any${successCount > 0 ? " other" : ""} audio available for track ${track.url}`);
					break;
				} else {
					console.error(`No ${fileType} audio available for track ${track.url}`);
				}
				failureCount++;
				if(!options.continueOnFailure) {
					return { successCount, failureCount };
				}
			}
		}
		// download all remaining files if needed
		if(downloadAll && (urlInfo.maxFilesPerTrack == null || successCount < urlInfo.maxFilesPerTrack)) {
			while(audioSources.length > 0) {
				// download highest priority audio
				const audioSrc: BandcampAudioSource = popHighestPriorityAudioSource(audioSources, priorities) as BandcampAudioSource;
				const success = await downloadTrackAudioSource(bandcamp, urlInfo, track, audioSrc, options);
				if(success) {
					successCount++;
					if(urlInfo.maxFilesPerTrack != null && successCount >= urlInfo.maxFilesPerTrack) {
						// we've downloaded the maximum allowed files per track
						break;
					}
				} else {
					failureCount++;
					if(!options.continueOnFailure) {
						return { successCount, failureCount };
					}
				}
			}
		}
	} else {
		// download highest priority audio
		const audioSrc: BandcampAudioSource = popHighestPriorityAudioSource(audioSources, priorities) as BandcampAudioSource;
		const success = await downloadTrackAudioSource(bandcamp, urlInfo, track, audioSrc, options);
		if(success) {
			successCount++;
		} else {
			failureCount++;
		}
	}
	return { successCount, failureCount };
}

async function downloadTrackAudioSource(bandcamp: Bandcamp, urlInfo: URLInfo, track: (BandcampTrack | BandcampAlbumTrack), audioSource: BandcampAudioSource, options: DownloadMediaOptions): Promise<boolean> {
	try {
		// download the file
		await bandcamp.downloadTrackAudioSource(track, audioSource, {
			dir: (urlInfo.dir ?? '.'),
			output: urlInfo.output,
			outputIsFormatString: true,
			createOutputPath: true,
			logger: (message) => {
				process.stderr.write(`${message}\n`);
			}
		});
		return true;
	} catch(error: any) {
		console.error(`Failed to download ${audioSource.type} audio for track ${track.url}`);
		if(error && error.message && !options.verbose) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		return false;
	}
}
