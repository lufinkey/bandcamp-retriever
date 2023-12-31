Bandcamp Retriever
==================

Retrieves info about albums, songs, artists etc from the bandcamp website.

## IMPORTANT NOTE
This was a tool built out of necessity. I love bandcamp and the fact that they provide DRM free downloads of your music. I chose to make this tool public because I want to enable others to make tools that help improve the usability of Bandcamp.

**PLEASE** consider whether your project helps artists to continue releasing their music on bandcamp, so it can continue to exist for purchasing DRM-free music.

## Library Usage

To make calls to bandcamp, import the `Bandcamp` type and create a new instance:
```js
import { Bandcamp } from 'bandcamp-retriever';
const bandcamp = new Bandcamp();
```
