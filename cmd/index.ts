
import { Bandcamp } from '../lib';
import {
	parseArgsOrExit,
	parseBooleanArgValue } from './cmdutils';
import { outputUsageError } from './help';
import { infoCommand } from './info';
import { downloadCommand } from './download';

// set defaults for options
let verbose = false;

// parse base arguments
let argi = 2;
let parseArgsResult = parseArgsOrExit(process.argv, argi, {
	longFlags: {
		'verbose': {
			value: 'optional',
			parseValue: parseBooleanArgValue,
			onRead: (flag, val) => { verbose = val ?? true; }
		}
	},
	shortFlags: {},
	stopBeforeNonFlagArg: true
}, outputUsageError);
argi = parseArgsResult.argIndex;

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
const bandcamp = new Bandcamp();

// handle command
(async () => {
	switch(cmd) {
		case 'info':
			await infoCommand(bandcamp, process.argv, argi, {
				verbose
			});
			break;
		
		case 'download':
			await downloadCommand(bandcamp, process.argv, argi, {
				verbose
			});
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