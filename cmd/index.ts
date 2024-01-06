
const FileCookieStore = require('file-cookie-store');
import tough from 'tough-cookie';
import { Bandcamp } from '../lib';
import {
	parseArgsOrExit,
	parseBooleanArgValue } from './cmdutils';
import { outputUsage, outputUsageError } from './Help';
import { infoCommand } from './Info';
import { downloadCommand } from './Download';
import { searchCommand } from './Search';

// set defaults for options
let verbose = false;
let cookiesFilePath: (string | undefined) = undefined;
let updateCookies: (boolean | undefined) = undefined;
let lockCookies: (boolean | undefined) = undefined;

// parse base arguments
let argi = 2;
let parseArgsResult = parseArgsOrExit(process.argv, argi, {
	longFlags: {
		'verbose': {
			value: 'optional',
			parseValue: parseBooleanArgValue,
			onRead: (flag, val) => { verbose = val ?? true; }
		},
		'cookies-file': {
			value: 'required',
			onRead: (flag, val) => {
				cookiesFilePath = val;
			}
		},
		'update-cookies': {
			value: 'optional',
			parseValue: parseBooleanArgValue,
			onRead: (flag, val) => { updateCookies = val ?? true; }
		},
		'lock-cookies': {
			value: 'optional',
			parseValue: parseBooleanArgValue,
			onRead: (flag, val) => { lockCookies = val ?? true; }
		}
	},
	shortFlags: {},
	stopBeforeNonFlagArg: true
}, outputUsageError);
argi = parseArgsResult.argIndex;

// load cookies if needed
let cookies: (tough.Store | (tough.Cookie | string)[] | undefined) = undefined;
if(cookiesFilePath) {
	cookies = new FileCookieStore(cookiesFilePath, {
		auto_sync: (updateCookies ?? true),
		lockfile: (lockCookies ?? false)
	});
}

// get command if able
if(argi >= process.argv.length) {
	console.error("no command specified");
	outputUsageError();
	process.exit(1);
}
const cmd = process.argv[argi];
argi++;

// create bandcamp object
// TODO allow specifying session cookies
const bandcamp = new Bandcamp({
	cookies
});

// handle command
(async () => {
	switch(cmd) {
		case 'info':
			await infoCommand(bandcamp, process.argv, argi, {
				verbose
			});
			break;

		case 'search':
			await searchCommand(bandcamp, process.argv, argi, {
				verbose
			});
			break;
		
		case 'download':
			await downloadCommand(bandcamp, process.argv, argi, {
				verbose
			});
			break;
		
		case 'help':
			outputUsage();
			break;
		
		default:
			console.error(`Invalid command ${cmd}`);
			process.exit(1);
			break;
	}
})().catch((error) => {
	if(error && error.message && !verbose) {
		console.error(error.message);
	} else {
		console.error(error);
	}
	outputUsageError();
	process.exit(1);
});
