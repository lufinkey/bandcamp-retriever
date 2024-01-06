
import { BandcampMediaTypes } from '../lib';
import { PrintFormats } from './cmdutils';

export const getUsageText = () =>
`bandcamp-retriever [--verbose] <command> [<args>]

OPTIONS:

	--verbose
		Enables verbose logging. Useful for debugging.

COMMANDS:

	info <URL>... [--media-type ${BandcampMediaTypes.join('|')}] [--print-format ${PrintFormats.join('|')}]
		
		Fetches, parses, and outputs info from the given bandcamp URL.
		
		--url <URL>

			Optionally specifies a URL to fetch info from via a flag, instead of using positional arguments.
		
		--media-type ${BandcampMediaTypes.join(' | ')}

			Forcibly specifies the type of media that the given URL points to. This will be deduced from the URL or page if not given.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
		
		--print-format ${PrintFormats.join(' | ')}

			The format to print the fetched info
	
	search <QUERY> [--media-type track | album | artist | fan] [--page <PAGE>] [--print-format ${PrintFormats.join('|')}]

		Searches the bandcamp website for the given query.
		
		--query <QUERY>

			Optionally specifies the search query via a flag, instead of using positional arguments
		
		--media-type any | ${BandcampMediaTypes.join(' | ')}

			Filter which kind of media type will be searched. Specifying either 'artist' or 'label' will show both artists and labels.
	
	download [--url] <URL>... [--media-type=track|album] [--dir=<PATH>] [--output=<FORMAT_PATH>]
		
		Downloads the track or album that the given URL points to.
		
		--url <URL>

			Optionally specifies a URL to download media from via a flag, instead of using positional arguments.
		
		--media-type track | album

			Forcibly specifies the type of media that the given URL points to. This will be deduced from the URL or page if not given.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
		
		--dir <PATH>

			The base directory where the files should get downloaded. If not included, the current working directory will be used.
		
		--output <FORMAT_PATH>

			A format path string specifying where tracks should get downloaded, relative to the base directory.
			A default output path structure will be used if not given.
			Example: '%(artistName)/%(albumName)/%(trackNumber:d2) %(name).%(fileExt)'
		
		--file-type <FILE_TYPE>[,<FILE_TYPE>]...
			
			Specifies the file type(s) to download. If multiple are given, they should be comma-separated.
			If 'all' is given, all file types will be downloaded.
		
		--prefer-file-type <FILE_TYPE>[,<FILE_TYPE>]...
			
			Specifies the preferred file type(s) to download, in order of highest to lowest priority. If multiple are given, they should be comma-separated.
		
		--max-files-per-track <NUM>

			Specifies the maximum number of files per track that should be downloaded, if the --file-type argument was given.
`;

export function outputUsage() {
	console.log(getUsageText());
};

export function outputUsageError() {
	console.error(getUsageText());
};
