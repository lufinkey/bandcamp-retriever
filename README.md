Bandcamp Retriever
==================

Retrieves info about albums, songs, artists etc from the bandcamp website.

## IMPORTANT NOTE
This was a tool built out of necessity. I love bandcamp and the fact that they provide DRM-free downloads of your music. I chose to make this tool public because I want to enable others to make tools that help improve the usability of Bandcamp.

**PLEASE** consider whether your project helps artists to continue releasing their music on bandcamp, so it can continue to exist for purchasing DRM-free music.

## Library Usage

To make calls to bandcamp, import the `Bandcamp` type and create a new instance:
```js
import { Bandcamp } from 'bandcamp-retriever';
const bandcamp = new Bandcamp();
```

## Command Line Usage

```
bandcamp-retriever [<OPTION>]... <COMMAND> [<ARG>]...
```

### Options

- --verbose

	Enables verbose logging. Useful for debugging.
	
- --cookies-file <FILE>
	
	Specifies the path to the cookies.txt file where the bandcamp session is stored.
	
- --dont-update-cookies
	
	Specifies that the cookies.txt file should NOT be updated after each request (if a cookies.txt file has been specified).
	
- --lock-cookies-file

	Specifies that a lockfile should be used to access the cookies.txt file.

### Commands

- **info** *&lt;URL&gt;*... [*&lt;OPTION&gt;*]...
	
	Fetches, parses, and outputs info from the given bandcamp URL.
	
	- --url *&lt;URL&gt;*

		Optionally specifies a URL to fetch info from via a flag, instead of from a positional argument.
		
	- --type *album* | *track* | *artist* | *fan*

		Forcibly specifies the type of item that the given URL points to.
		This will be deduced from the URL or page if not given.
		If more than 1 URL is given, this argument should be placed after the URL it refers to.
		
	- --additional-data[=*yes*|*no*]

		Specifies if additional resources should be fetched for the given URL's page.
		Some bandcamp pages require fetching additional resources to populate extra data for the entity at the URL.
		If more than 1 URL is given, this argument should be placed after the URL it refers to.
		Just passing `--additional-data` without `=yes` or `=no` will specify `yes`.
		Default is `yes` if argument is not passed.
		
	- --additional-pages[=*yes*|*no*]

		Specifies if additional pages should be fetched for the entity at the given URL.
		Some bandcamp entities may require fetching data from additional pages to populate extra data for the entity at the URL.
		If more than 1 URL is given, this argument should be placed after the URL it refers to.
		Just passing `--additional-pages` without `=yes` or `=no` will specify `yes`.
		Default is `no` if argument is not passed.
		
	- --print-format *readable-brief* | *readable* | *json* | *json-pretty*

		The format to print the fetched info
	

- **collection** *&lt;URL OR USERNAME&gt;* [*&lt;OPTION&gt;*]...

	Fetches items from one of the collections of the given profile.

	- --profile-id *&lt;ID&gt;*

		Optionally specifies the fan ID for the given fan profile. The fan ID is a numeric value.

	- --collection *collection* | *wishlist* | *following-artists* | *following-fans* | *followers*

		Optionally specifies the collection to fetch from. If not given, the fan's "Collection" page is used.
	
	- --limit &lt;COUNT&gt;

		Optionally specifies the maximum number of items to return.
		Default value is `20` is no argument is passed
	
	- --older-than-token <TOKEN>

		Optionally specifies the token of the item before the first item to return in the results.
	
	- --print-format *readable-brief* | *readable* | *json* | *json-pretty*

		The format to print the fetched info

- **search** *&lt;QUERY&gt;* [*&lt;OPTION&gt;*]...

	Searches the bandcamp website for the given query.
	
	- --type *any* | *album* | *track* | *artist* | *label* | *fan*

		Filter which type of items to search for. Specifying either 'artist' or 'label' will show both artists and labels.
	
	- --print-format *readable-brief* | *readable* | *json* | *json-pretty*

		The format to print the search results

- **search-collection** *&lt;URL_OR_USERNAME&gt;* *&lt;QUERY&gt;* [*&lt;OPTION&gt;*]...

	Searches the collection on the given profile.

	- --collection *wishlist*

		Specify which collection to search on the profile

	- --print-format *readable-brief* | *readable* | *json* | *json-pretty*

		The format to print the search results.

- **download** *&lt;URL&gt;*... [*&lt;OPTION&gt;*]...
	
	Downloads the track or album that the given URL points to.

	- --url *&lt;URL&gt;*

		Optionally specifies a URL to download media from via a flag, instead of from a positional argument.
	
	- --type *track* | *album*

		Forcibly specifies the type of item that the given URL points to. This will be deduced from the URL or page if not given.
		If more than 1 URL is given, this argument should be placed after the URL it refers to.
	
	- --dir *&lt;PATH&gt;*

		The base directory where the files should get downloaded. If not included, the current working directory will be used.
	
	- --output *&lt;FORMAT_PATH&gt;*

		A format path string specifying where tracks should get downloaded, relative to the base directory (specified with `--dir`).
		A default output path structure will be used if not given.
		Example: '%(artistName)/%(albumName)/%(trackNumber:d2) %(name).%(fileExt)'
	
	- --file-type *&lt;FILE_TYPE&gt;*[,*&lt;FILE_TYPE&gt;*]...
		
		Specifies the file type(s) to download. If multiple are given, they should be comma-separated.
		If 'all' is given, all file types will be downloaded.
	
	- --prefer-file-type *&lt;FILE_TYPE&gt;*[,*&lt;FILE_TYPE&gt;*]...
		
		Specifies the preferred file type(s) to download, in order of highest to lowest priority. If multiple are given, they should be comma-separated.
	
	- --max-files-per-track *&lt;NUM&gt;*

		Specifies the maximum number of files per track that should be downloaded, if the --file-type argument was given.

### API

- **Bandcamp** *(class)*

	- **search(** query: `string`, options: `{ item_type?: string, page?: number }` = {} **)**: `Promise<BandcampSearchResultsList>`

		Perform a search with a given query

	- **getTrack(** url: `string` **)**: `Promise<BandcampTrack>`

		Fetch info for a given track

	- **getAlbum(** url: `string` **)**: `Promise<BandcampAlbum>`

		Fetch info for a given album

	- **getArtist(** url: `string` **)**: `Promise<BandcampArtist>`

		Fetch info for a given artist

	- **getFan(** url: `string` **)**: `Promise<BandcampFan>`

		Fetch info for a given fan profile

	- **updateSessionCookies(** cookies: `string[] | tough.Cookie[]` **)**

		Updates the cookies for the current session

	- **logout()**

		Clear the current login session

	- **session** *(read-only)*

		The current session
	
	- **isLoggedIn** *(read-only)*

		Tells whether the current session contains auth cookies
		
	- **getMyIdentities()**: `Promise<BandcampIdentities>`

		Fetches the "identities" for the currently authenticated user
