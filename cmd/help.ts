
import { BandcampMediaTypes } from '../lib';
import { OutputFormats } from './cmdutils';

export const getUsageText = () =>
`bandcamp-retriever [--verbose] <command> [<args>]

OPTIONS:

	--verbose
		Enables verbose logging. Useful for debugging.

COMMANDS:

	info [--media-type=${BandcampMediaTypes.join('|')}]  <URL>
		
		Fetches, parses, and outputs info from the given bandcamp URL.
		
		--media-type ${BandcampMediaTypes.join(' | ')}

			Forcibly specifies the type of media that the given URL points to. This will be deduced from the URL or page if not given.
			If more than 1 URL is given, this argument should be placed before the URL it refers to.
		
		--output-format ${OutputFormats.join(' | ')}
	
	download [--media-type=track|album] [--dir=<PATH>] [--filepath=<PATH>] <URL>
		
		Downloads the track or album that the given URL points to
`;

export function outputUsage() {
	console.log(getUsageText());
};

export function outputUsageError() {
	console.error(getUsageText());
};
