
import { BandcampItemTypes } from '../lib';
import { PrintFormats } from './cmdutils';

export const getUsageText = () =>
`bandcamp-retriever [--verbose] [--cookies-file <FILE> [--update-cookies] [--lock-cookies]] <command> [<args>]

OPTIONS:

	--verbose

		Enables verbose logging. Useful for debugging.
	
	--cookies-file <FILE>
	
		Specifies the path to the cookies.txt file where the bandcamp session is stored.
	
	--dont-update-cookies
	
		Specifies that the cookies.txt file should NOT be updated after each request (if a cookies.txt file has been specified).
	
	--lock-cookies-file

		Specifies that a lockfile should be used to access the cookies.txt file.

COMMANDS:

	info <URL>... [--type ${BandcampItemTypes.join('|')}] [--print-format ${PrintFormats.join('|')}]
		
		Fetches, parses, and outputs info from the given bandcamp URL.
		
		--url <URL>

			Optionally specifies a URL to fetch info from via a flag, instead of from a positional argument.
		
		--type ${BandcampItemTypes.join(' | ')}

			Forcibly specifies the type of item that the given URL points to.
			This will be deduced from the URL or page if not given.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
		
		--additional-data[=yes|no]

			Specifies if additional resources should be fetched for the given URL's page.
			Some bandcamp pages require fetching additional resources to populate extra data for the entity at the URL.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
			Just passing --additional-pages without =yes or =no will specify yes.
			Default is yes if argument is not passed.
		
		--additional-pages[=yes|no]

			Default is no. Specifies if additional pages should be fetched for the entity at the given URL.
			Some bandcamp entities may require fetching data from additional pages to populate extra data for the entity at the URL.
			If more than 1 URL is given, this argument should be placed after the URL it refers to.
			Just passing --additional-pages without =yes or =no will specify yes.
			Default is no if argument is not passed.
		
		--print-format ${PrintFormats.join(' | ')}
			
			The format to print the fetched info
	
	collection <URL_OR_USERNAME> [--profile-id <ID>] [--collection collection | wishlist | following-artists | following-fans | followers] [--limit <COUNT>] [--older-than-token <TOKEN>] [--print-format ${PrintFormats.join('|')}]
	
		Fetches items from one of the collections of the given profile.
		
		--profile-id <ID>

			Optionally specifies the fan ID for the given profile.
			The fan ID is a numeric value.

		--collection collection | wishlist | following-artists | following-fans | followers

			Optionally specifies the collection to fetch from.
			If not given, the fan's "Collection" page is used.
		
		--limit <COUNT>

			Default is 20. Optionally specifies the maximum number of items to return.
		
		--older-than-token <TOKEN>

			Optionally specifies the token of the item before the first item to return in the results.
		
		--print-format ${PrintFormats.join(' | ')}

			The format to print the fetched info

	search <QUERY> [--type track | album | artist | fan] [--page <PAGE>] [--print-format ${PrintFormats.join('|')}]

		Searches the bandcamp website for the given query.
		
		--type any | ${BandcampItemTypes.join(' | ')}

			Filter which type of items to search for. Specifying either 'artist' or 'label' will show both artists and labels.
		
		--print-format ${PrintFormats.join(' | ')}

			The format to print the search results
	
	download [--url] <URL>... [--type=track|album] [--dir=<PATH>] [--output=<FORMAT_PATH>]
		
		Downloads the track or album that the given URL points to.
		
		--url <URL>

			Optionally specifies a URL to download media from via a flag, instead of from a positional argument.
		
		--type track | album

			Forcibly specifies the type of item that the given URL points to. This will be deduced from the URL or page if not given.
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
