
import {
	Bandcamp,
	BandcampIdentities } from '../lib';
import {
	FlagOptions,
	parseArgs,
	parseBooleanArgValue,
	PrintFormat,
	PrintFormats,
	convertObjectToPrintFormat } from './cmdutils';

export async function identityCommand(bandcamp: Bandcamp, argv: string[], argi: number, options: { verbose: boolean }) {
	let printFormat = 'readable-brief' as PrintFormat;
	
	parseArgs(argv, argi, {
		longFlags: {
			'print-format': {
				value: 'required',
				parseValue: (val): PrintFormat => {
					if(PrintFormats.indexOf(val) == -1) {
						throw new Error(`Invalid output format ${val}`);
					}
					return val as PrintFormat;
				},
				onRead: (flag, val) => { printFormat = val; }
			}
		},
		shortFlags: {
		},
		recognizeDoubleDash: false,
		recognizeSingleDash: false,
		stopBeforeNonFlagArg: false,
		onNonFlagArg: (arg) => {
			throw new Error(`Invalid argument ${arg}`);
		}
	});
	
	const identities = await bandcamp.getMyIdentities();
	
	const objOutput = convertObjectToPrintFormat(identities, printFormat);
	console.log(objOutput);
};