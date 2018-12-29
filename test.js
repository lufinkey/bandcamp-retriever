
const Bandcamp = require('./');

(async () => {
	const bandcamp = new Bandcamp();
	const result = await bandcamp.search("Phony ppl");
	console.log("result:");
	console.log(result);
})().then(() => {
	//
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
