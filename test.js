
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
	const albumInfo = await bandcamp.getItemFromURL(result.items[1].url);
	console.log("getItemFromURL:");
	console.log(albumInfo);
	console.log("\n\n");
	const trackInfo = await bandcamp.getItemFromURL(result.items[2].url);
	console.log("getItemFromURL 2:");
	console.log(trackInfo);
	console.log("\n\n");
	const artist = await bandcamp.getArtist(result.items[0].url);
	console.log("getArtist:");
	console.log(artist);
	console.log("\n\n");
})().then(() => {
	//
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
