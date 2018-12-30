
const Bandcamp = require('./');

(async () => {
	const bandcamp = new Bandcamp();
	const result = await bandcamp.search("Phony ppl");
	console.log("search:");
	console.log(result);
	console.log("\n\n");
	const albumInfo = await bandcamp.getInfoFromURL(result[1].url);
	console.log("getInfoFromURL:");
	console.log(albumInfo);
})().then(() => {
	//
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
