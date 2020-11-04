
const Bandcamp = require('./src/Bandcamp');

(async () => {
	const bandcamp = new Bandcamp();

	const searchResponse = await bandcamp.search("Phony ppl");
	console.log("search headers:");
	console.log(searchResponse.headers);
	console.log("\n\n");
	const searchResult = searchResponse.data;
	console.log("search:");
	console.log(searchResult);
	console.log("\n\n");

	const albumInfo = (await bandcamp.getItemFromURL(searchResult.items[1].url)).data;
	console.log("getItemFromURL: 1");
	console.log(albumInfo);
	console.log("\n\n");

	const trackInfo = (await bandcamp.getItemFromURL(searchResult.items[4].url)).data;
	console.log("getItemFromURL: 2");
	console.log(trackInfo);
	console.log("\n\n");

	const album2Info = (await bandcamp.getItemFromURL("https://a3cmusic.bandcamp.com/album/a3c-volume-2")).data;
	console.log("getItemFromURL: A3C Volume 2");
	console.log(album2Info);
	console.log("\n\n");

	const artist = (await bandcamp.getArtist(searchResult.items[0].url)).data;
	console.log("getArtist:");
	console.log(artist);
	console.log("\n\n");

	console.log("slugify:");
	const slugTests = {
		'&': '-',
		'Son of Reji [റെജിയുടെ മകൻ]': 'son-of-reji',
		"a toi mǝ'SHēn": 'a-toi-m-sh-n',
		'love[s]': 'love-s',
		'(G​)​LOVE​(​S)': 'g-love-s',
		'20 2 ∞': '20-2',
		'Industrial Noise Concert (Remixes)': 'industrial-noise-concert-remixes',
		'Instrumentais V. 1': 'instrumentais-v-1',
		'V.1': 'v-1',
		'A+B': 'a-b',
		'A/B': 'a-b',
		'(///)': '-'
	};
	let slugPassCount = 0;
	let slugTotalCount = 0;
	for(const testString in slugTests) {
		const expectedResult = slugTests[testString];
		const result = bandcamp.slugify(testString);
		const passed = (result === expectedResult);
		if(!passed) {
			console.log("input: "+testString);
			console.log("expcted output: "+expectedResult);
			console.log("actual result: "+result);
			console.log("");
		}
		else {
			slugPassCount += 1;
		}
		slugTotalCount += 1;
	}
	console.log(slugPassCount+" / "+slugTotalCount+" tests passed");
	console.log("\n\n");
})().then(() => {
	//
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
