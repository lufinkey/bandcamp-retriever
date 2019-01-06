
if(typeof XMLHttpRequest === 'undefined') {
	global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
}
const Bandcamp = require('./');

(async () => {
	const bandcamp = new Bandcamp();
	const result = await bandcamp.search("Phony ppl");
	console.log("search:");
	console.log(result);
	console.log("\n\n");
	const albumInfo = await bandcamp.getInfoFromURL(result.items[1].url);
	console.log("getInfoFromURL:");
	console.log(albumInfo);
	console.log("\n\n");
	const trackInfo = await bandcamp.getInfoFromURL(result.items[2].url);
	console.log("getInfoFromURL 2:");
	console.log(trackInfo);
	console.log("\n\n");
	const albums = await bandcamp.getArtist(result.items[0].url);
	console.log("getArtistAlbums:");
	console.log(albums);
	console.log("\n\n");
})().then(() => {
	//
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
