
import { strict as assert } from 'assert';
import { Bandcamp, BandcampFan, BandcampSearchResultsList } from '../lib';

let testsToRun = process.argv.slice(2);
console.log(`tests to run = ${testsToRun.length > 0 ? JSON.stringify(testsToRun) : "all"}`);
console.log();
testsToRun = testsToRun.map((testName) => testName.toLowerCase());

const bandcamp = new Bandcamp();

const tests: { [key: string]: any } = {
	async testGetSingleTrack() {
		return await bandcamp.getTrack('https://jaydiggs.bandcamp.com/track/w-a-p-funk');
	},

	async testGetPaidAlbum() {
		return await bandcamp.getAlbum('https://music.dirtwire.net/album/atlas-ep');
	},

	phonyPplSearchResult: (undefined as BandcampSearchResultsList | undefined),

	async testSearchPhonyPpl() {
		const results = await bandcamp.search("Phony ppl");
		this.phonyPplSearchResult = results;
		return results;
	},

	async testGetItemFromSearch1() {
		const result = this.phonyPplSearchResult;
		return await bandcamp.getItemFromURL(result.items[1].url);
	},

	async testGetItemFromSearch2() {
		const result = this.phonyPplSearchResult;
		return await bandcamp.getItemFromURL(result.items[4].url);
	},

	async testGetArtistFromSearch() {
		const result = this.phonyPplSearchResult;
		return await bandcamp.getItemFromURL(result.items[0].url);
	},

	async testGetItemFromURL_A3CVolume2() {
		return await bandcamp.getItemFromURL("https://a3cmusic.bandcamp.com/album/a3c-volume-2");
	},

	async testGetArtistXPhonyX() {
		return await bandcamp.getArtist("https://xphonyx.bandcamp.com/");
	},

	async testGetTrackEndOfTheNight() {
		return await bandcamp.getTrack('https://selfeducatedvinyl.bandcamp.com/track/end-of-the-night-af-the-naysayer-remix');
	},

	lfFanPage: undefined as (BandcampFan | undefined),

	async testGetFanLufinkey() {
		const fan = await bandcamp.getFan("https://bandcamp.com/lufinkey");
		this.lfFanPage = fan;
		return fan;
	},

	async testGetFanWishlistItemsLufinkey() {
		const fan = this.lfFanPage;
		if(!fan?.wishlist) {
			throw new Error("No wishlist from fan page");
		}
		return await bandcamp.getFanWishlistItems(fan.url, fan.id, {
			olderThanToken: fan.wishlist.lastToken,
			count: fan.wishlist.batchSize
		});
	},

	async testGetFanFollowersJohnMay() {
		const fan = await bandcamp.getFan("https://bandcamp.com/johnmay");
		if(!fan.followers) {
			throw new Error("No followers from fan page");
		}
		return await bandcamp.getFanFollowers(fan.url, fan.id, {
			olderThanToken: fan.followers.lastToken,
			count: fan.followers.batchSize
		});
	},

	testSlugify() {
		const slugTests: {[key: string]: string} = {
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
	},
};

(async () => {
	for(const key in tests) {
		if(!key.startsWith("test")) {
			continue;
		}
		const func = tests[key];
		if(typeof func !== 'function') {
			continue;
		}
		const testName = key.substring(4, 5).toLowerCase() + key.substring(5);
		if(testsToRun.length > 0 && !testsToRun.includes(testName.toLowerCase())) {
			continue;
		}
		try {
			console.log(`Testing ${testName}`);
			const result = await (func as Function).call(tests);
			console.log(JSON.stringify(result, null, '\t'));
		} catch(error) {
			console.error(error);
		}
		console.log();
		console.log();
		console.log();
	}
})().catch((error) => {
	console.error(error);
});
