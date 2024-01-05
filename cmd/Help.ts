
import { BandcampMediaTypes } from '../lib';
import { PrintFormats } from './cmdutils';

export const getUsageText = () =>
`bandcamp-retriever [--verbose] <command> [<args>]

OPTIONS:

	--verbose
		Enables verbose logging. Useful for debugging.

COMMANDS:

	info <URL>... [--media-type=${BandcampMediaTypes.join('|')}] [--print-format ${PrintFormats.join('|')}]
		
		Fetches, parses, and outputs info from the given bandcamp URL.
		
		--media-type ${BandcampMediaTypes.join(' | ')}

			Forcibly specifies the type of media that the given URL points to. This will be deduced from the URL or page if not given.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
		
		--print-format ${PrintFormats.join(' | ')}

			The format to print the fetched info
	
	download <URL>... [--media-type=track|album] [--dir=<PATH>] [--output=<FORMAT_PATH>]
		
		Downloads the track or album that the given URL points to.
`;

export function outputUsage() {
	console.log(getUsageText());
};

export function outputUsageError() {
	console.error(getUsageText());
};
