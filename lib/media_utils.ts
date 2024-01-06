
import fs from 'fs';
import path from 'path';
import {
	BandcampAudioSource,
	BandcampAudioFileType,
	BandcampTrack,
	BandcampAlbumTrack } from './types';
import { resolveFormatString } from './formatstring';

export function indexOfAudioSourceType(audioSources: BandcampAudioSource[], fileType: string): number {
	return audioSources.findIndex((src) => (src.type == fileType));
}

export function popAudioSourceOfType(audioSources: BandcampAudioSource[], fileType: string): (BandcampAudioSource | null) {
	const index = indexOfAudioSourceType(audioSources, fileType);
	if(index == -1) {
		return null;
	}
	const audioSrc = audioSources[index];
	audioSources.splice(index, 1);
	return audioSrc;
}

export function indexOfHighestPriorityAudioSource(audioSources: BandcampAudioSource[], priorities: { [key: (BandcampAudioFileType | string)]: number }): number {
	if(audioSources.length == 0) {
		return -1;
	}
	let bestAudioSourceIndex = -1;
	let bestAudioSourcePriority = Infinity;
	for(let i=0; i<audioSources.length; i++) {
		const audioSource = audioSources[i];
		const priority = priorities[audioSource.type];
		if(priority != null && (bestAudioSourceIndex == -1 || priority < bestAudioSourcePriority)) {
			bestAudioSourceIndex = i;
			bestAudioSourcePriority = priority;
		}
	}
	if(bestAudioSourceIndex == -1) {
		bestAudioSourceIndex = 0;
	}
	return bestAudioSourceIndex;
}

export function popHighestPriorityAudioSource(audioSources: BandcampAudioSource[], priorities: { [key: (BandcampAudioFileType | string)]: number }): (BandcampAudioSource | null) {
	const index = indexOfHighestPriorityAudioSource(audioSources, priorities);
	if(index == -1) {
		return null;
	}
	const audioSrc = audioSources[index];
	audioSources.splice(index, 1);
	return audioSrc;
}

export function getFileExtensionForAudioFileType(fileType: BandcampAudioFileType | string): string {
	switch(fileType) {
		case 'mp3':
		case 'mp3-v0':
		case 'mp3-128':
		case 'mp3-320':
			return 'mp3';
		case 'flac':
			return 'flac';
		case 'aac':
		case 'aac-hi':
			return 'aac';
		case 'aiff-lossless':
			return 'aiff';
		case 'vorbis':
			return 'vob';
		case 'alac':
			return 'm4a';
		case 'wav':
			return 'wav';
	}
	const dashIndex = fileType.indexOf('-');
	if(dashIndex > 0) {
		return fileType.substring(0, dashIndex);
	}
	return fileType;
}


export function formatTrackAudioFileOutputPath(outputPath: string, track: (BandcampTrack | BandcampAlbumTrack), audioSource: BandcampAudioSource) {
	const fileExtension = getFileExtensionForAudioFileType(audioSource.type);
	return resolveFormatString(outputPath, {
		...track,
		fileExt: fileExtension,
		audioType: audioSource.type
	});
}

export async function createPathForFile(baseDir: string, filepath: string, options: { verbose?: boolean, logger?: (message: any) => void }) {
	const relativePath = path.relative(baseDir, filepath);
	if(path.isAbsolute(relativePath)) {
		// create missing path parts
		if(!(fs.existsSync(relativePath))) {
			if (options.verbose && options.logger) {
				options.logger(`Creating full relative output path ${relativePath}`);
			}
			await fs.promises.mkdir(relativePath, { recursive: true });
		}
	} else {
		// remove . parts from front of path
		const pathParts = relativePath.split(/[\/\\]/);
		while (pathParts.length > 0 && pathParts[0] == '.') {
			pathParts.splice(0, 1);
		}
		// remove last path part
		if (pathParts.length > 0) {
			pathParts.splice(pathParts.length-1, 1);
		}
		// create path parts recursively
		let partialPath = '';
		for (const part of pathParts) {
			if(partialPath.length == 0) {
				partialPath = part;
			} else {
				partialPath += '/';
				partialPath += part;
			}
			// create directory if missing
			const dirPath = path.resolve(baseDir, partialPath);
			if(!(await fs.existsSync(dirPath))) {
				if (options.verbose && options.logger) {
					options.logger(`Creating output directory ${relativePath}`);
				}
				await fs.promises.mkdir(dirPath, { recursive: false });
			}
		}
	}
}
