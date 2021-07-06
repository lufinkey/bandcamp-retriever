
const Bandcamp = require('./src/Bandcamp');

(async () => {
	const bandcamp = new Bandcamp();

	const wapTrack = await bandcamp.getTrack('https://jaydiggs.bandcamp.com/track/w-a-p-funk');
	console.log("single track:");
	console.log(wapTrack);
	console.log("\n\n");

	const paidAlbumResult = await bandcamp.getAlbum('https://music.dirtwire.net/album/atlas-ep');
	console.log("paid album:");
	console.log(paidAlbumResult);
	console.log("\n\n");

	const result = await bandcamp.search("Phony ppl");
	console.log("search:");
	console.log(result);
	console.log("\n\n");

	const albumInfo = await bandcamp.getItemFromURL(result.items[1].url);
	console.log("getItemFromURL: 1");
	console.log(albumInfo);
	console.log("\n\n");

	const trackInfo = await bandcamp.getItemFromURL(result.items[4].url);
	console.log("getItemFromURL: 2");
	console.log(trackInfo);
	console.log("\n\n");

	const album2Info = await bandcamp.getItemFromURL("https://a3cmusic.bandcamp.com/album/a3c-volume-2");
	console.log("getItemFromURL: A3C Volume 2");
	console.log(album2Info);
	console.log("\n\n");

	const artist = await bandcamp.getArtist(result.items[0].url);
	console.log("getArtist:");
	console.log(artist);
	console.log("\n\n");

	const artist2 = await bandcamp.getArtist("https://xphonyx.bandcamp.com/");
	console.log("getArtist xphonyx:");
	console.log(artist2);
	console.log("\n\n");

	const single = await bandcamp.getTrack('https://selfeducatedvinyl.bandcamp.com/track/end-of-the-night-af-the-naysayer-remix');
	console.log("getTrack end of the night");
	console.log(single);
	console.log("\n\n");

	const fan = await bandcamp.getFan("https://bandcamp.com/lufinkey");
	console.log("getFan lufinkey:");
	console.log(fan);
	console.log("\n\n");
	console.log("getFan lufinkey wishlist:");
	console.log(JSON.stringify(fan.wishlist,null,'\t'));
	console.log("\n\n");

	const wishlist = await bandcamp.getFanWishlistItems(fan.url, fan.id, {
		olderThanToken: fan.wishlist.lastToken,
		count: fan.wishlist.batchSize
	});
	console.log("getFanWishlistItems lufinkey:");
	console.log(JSON.stringify(wishlist,null,'\t'));
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
