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
### API

- **Bandcamp** *(class)*

  - **loginWithCookies(** cookies: string[] | `tough.Cookie`[] **)**

    Log in using an array of cookies or cookie strings

  - **loginWithSession(** session: `BandcampSession` **)**

    Log in using an existing session object

  - **updateSessionCookies(** cookies: string[] | `tough.Cookie`[] **)**

    Updates the cookies for the current session

  - **logout()**

    Clear the current login session

  - **session** *(read-only)*

    The current auth session

  - **search(** query: string, options: `{[key: string]: any}` = {} **)**: Promise<BandcampSearchResultsList>

    Perform a search with a given query

  - **getTrack(** url: string, options: `{[key: string]: any}` = {} **)**: Promise<BandcampTrack>

    Fetch info for a given track

  - **getAlbum(** url: string, options: `{[key: string]: any}` = {} **)**: Promise<BandcampAlbum>

    Fetch info for a given album

  - **getArtist(** url: string, options: `{[key: string]: any}` = {} **)**: Promise<BandcampArtist>

    Fetch info for a given artist

  - **getFan(** url: string, options: `{[key: string]: any}` = {} **)**: Promise<BandcampFan>

    Fetch info for a given fan profile

  - **getMyIdentities()**: Promise<BandcampIdentities>

    Fetches the "identities" for the currently authenticated user
