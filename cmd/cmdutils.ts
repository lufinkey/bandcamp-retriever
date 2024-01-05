

export type FlagOptions = {
	value: 'required' | 'optional' | 'none';
	parseValue?: (val: string) => any;
	onRead: (flag: string, val: any) => void;
};

export type ArgumentParseOptions = {
	shortFlags: {[key: string]: FlagOptions};
	longFlags: {[key: string]: FlagOptions};
	onUnrecognizedShortFlag?: (argIndex: number, flag: string, indexInArg: number, arg: string) => ({argIndex: number} | {indexInArg: number} | undefined);
	onUnrecognizedLongFlag?: (argIndex: number, flag: string, value: any, arg: string) => ({argIndex: number} | undefined);
	stopAfterSingleDash?: boolean;
	onSingleDash?: () => (boolean | undefined | void);
	stopAfterDoubleDash?: boolean;
	onDoubleDash?: () => (boolean | undefined | void);
	stopBeforeNonFlagArg?: boolean;
	onNonFlagArg?: (arg: string) => (boolean | undefined | void);
};


export type ParseArgsResult = {
	argIndex: number
};


export function parseBooleanArgValue(arg: string): boolean | undefined {
	if (arg == '0' || arg == 'false' || arg == 'no') {
		return false;
	} else if(arg == '1' || arg == 'true' || arg == 'yes') {
		return true;
	} else {
		console.error(`invalid boolean value ${arg}`);
		return undefined;
	}
}


export function parseArgs(argv: string[], startIndex: number, options: ArgumentParseOptions): ParseArgsResult {
	// parse arguments
	let argi = startIndex;
	const argCount = argv.length;
	while (argi < argCount) {
		const arg = argv[argi];
		// ignore empty parameter
		if (arg.trim().length == 0) {
			console.error(`ignoring empty argument ${argi}`);
			argi++;
			continue;
		}
		// parse flags
		if (arg.startsWith('--')) {
			// parse named flag
			const flag = arg.substring(2);
			if (flag.length == 0) {
				// argument was --
				const shouldContinue = (options.onDoubleDash ? options.onDoubleDash() : undefined) ?? !(options.stopAfterDoubleDash ?? true);
				if(shouldContinue == false) {
					argi++;
					break;
				}
			} else {
				// check for value
				const eqIndex = flag.indexOf('=');
				let flagName: string;
				let flagVal: string | undefined | null;
				if (eqIndex == -1) {
					flagName = flag;
					flagVal = undefined;
				} else {
					flagName = flag.substring(0, eqIndex);
					flagVal = flag.substring(eqIndex+1);
				}
				const longFlagOpts = options.longFlags[flagName];
				if(longFlagOpts) {
					switch (longFlagOpts.value) {
						case 'required': {
							if(flagVal == undefined) {
								argi++;
								if(argi >= argCount) {
									throw new Error(`Missing value for flag ${flagName}`);
								}
								flagVal = argv[argi];
							}
							if(longFlagOpts.parseValue) {
								flagVal = longFlagOpts.parseValue(flagVal);
							}
						} break;

						case 'optional': {
							if(flagVal != undefined && longFlagOpts.parseValue) {
								flagVal = longFlagOpts.parseValue(flagVal);
							}
						} break;

						case 'none':
							if(flagVal != undefined) {
								throw new Error(`Flag ${flagName} should not have a value`);
							}
							break;

						default:
							throw new Error(`invalid longFlagOpts.value ${longFlagOpts.value}`);
					}
					longFlagOpts.onRead(flagName, flagVal);
				} else {
					if(options.onUnrecognizedLongFlag) {
						const nextArg = options.onUnrecognizedLongFlag(argi, flagName, flagVal, arg);
						if(nextArg) {
							argi = nextArg.argIndex;
							continue;
						}
					} else {
						throw new Error(`Invalid flag ${flagName}`);
					}
				}
			}
		}
		else if(arg.startsWith('-')) {
			// parse single character flags
			const argLen = arg.length;
			if (argLen > 0) {
				let nextArg: ({argIndex:number} | undefined) = undefined;
				for (let i = 1 ; i < argLen ; i++ ) {
					const flagName = arg.substring(i, 1);
					const shortFlagOpts = options.shortFlags[flagName];
					let flagVal = undefined;
					if(shortFlagOpts) {
						switch (shortFlagOpts.value) {
							case 'required': {
								if(i < (argLen-1)) {
									// use remainder of string as the argument
									// check for = sign
									if(arg[i+1] == '=') {
										i++;
									}
									flagVal = arg.substring(i+1);
								} else {
									// next argument is the value
									argi++;
									if(argi >= argCount) {
										throw new Error(`Missing value for flag ${flagName}`);
									}
									flagVal = argv[argi];
								}
								if(shortFlagOpts.parseValue) {
									flagVal = shortFlagOpts.parseValue(flagVal);
								}
							} break;

							case 'optional': {
								// use remainder of string as the argument if '='
								if(i < (argLen-1) && arg[i+1] == '=') {
									flagVal = arg.substring(i+2);
								}
							} break;
	
							case 'none':
								if(i < (argLen-1) && arg[i+1] == '=') {
									// remainder of string is an argument
									throw new Error(`Flag ${flagName} should not have a value`);
								}
								break;
	
							default:
								throw new Error(`invalid shortFlagOpts.value ${shortFlagOpts.value}`);
						}
						shortFlagOpts.onRead(flagName, flagVal);
					} else {
						if(options.onUnrecognizedShortFlag) {
							const maybeNextArg = options.onUnrecognizedShortFlag(argi, flagName, i, arg);
							if(maybeNextArg && (maybeNextArg as {indexInArg:number}).indexInArg != null) {
								i = ((maybeNextArg as {indexInArg:number}).indexInArg - 1);
								continue;
							}
							nextArg = maybeNextArg as (undefined | {argIndex:number});
							break;
						} else {
							throw new Error(`Invalid flag ${flagName}`);
						}
					}
				}
				if(nextArg) {
					argi = nextArg.argIndex;
					continue;
				}
			}
			else {
				// argument was -
				const shouldContinue = (options.onSingleDash ? options.onSingleDash() : undefined) ?? !(options.stopAfterSingleDash ?? true);
				if(shouldContinue == false) {
					argi++;
					break;
				}
			}
		}
		else {
			// reached non-flag argument
			if(options.stopBeforeNonFlagArg ?? (options.onNonFlagArg == null)) {
				break
			}
			if(options.onNonFlagArg) {
				const shouldContinue = options.onNonFlagArg(arg);
				if(shouldContinue == false) {
					break;
				}
			}
		}
		argi++;
	}
	return {argIndex: argi};
}


export function parseArgsOrExit(argv: string[], startIndex: number, options: ArgumentParseOptions, afterError: () => void): ParseArgsResult {
	try {
		return parseArgs(process.argv, startIndex, options);
	} catch(error: any) {
		if(error && error.message) {
			console.error(error.message);
		} else {
			console.error(error);
		}
		if(afterError) {
			afterError();
		}
		process.exit(1);
	}
}


export type PrintFormat = 'readable-brief' | 'readable' | 'json' | 'json-pretty';
export const PrintFormats = [ 'readable-brief', 'readable', 'json', 'json-pretty' ];

export function convertObjectToPrintFormat(obj: any, format: PrintFormat): string {
	switch(format) {
		case 'readable-brief':
			return convertObjectToReadableFormat(obj, {
				maxArrayEntries: 2,
				currentLineLength: 0,
				linePrefix: '',
				linePrefixLength: 0,
				indent: '  ',
				indentLength: 2
			});

		case 'readable':
			return convertObjectToReadableFormat(obj, {
				maxArrayEntries: null,
				currentLineLength: 0,
				linePrefix: '',
				linePrefixLength: 0,
				indent: '  ',
				indentLength: 2
			});
		
		case 'json':
			return JSON.stringify(obj);
		
		case 'json-pretty':
			return JSON.stringify(obj, null, '\t');
	}
}

const ReadableFormat_SameLineTypes = [ 'undefined', 'boolean', 'number', 'string', 'bigint', 'symbol' ];

export function convertObjectToReadableFormat(obj: any, options: {
	maxArrayEntries: number | null,
	currentLineLength: number,
	linePrefix: string,
	linePrefixLength: number,
	indent: string,
	indentLength: number,
	startObjectOnNewline?: boolean
}): string {
	const objType = typeof obj;
	switch(objType) {
		case 'undefined':
		case 'boolean':
		case 'number':
		case 'string':
		case 'bigint':
			return JSON.stringify(obj);

		case 'function':
			return `function ${(obj as Function).name || '<UNNAMED>'}`;
		
		case 'symbol':
			return obj.toString();
		
		case 'object':
			if(obj === null) {
				// null
				return 'null';
			} else if(obj instanceof Array) {
				// Array
				if (obj.length == 0) {
					return 'empty';
				}
				if(options.maxArrayEntries != null && obj.length > options.maxArrayEntries) {
					return `${obj.length} entries`;
				}
				// output each line separately
				const innerLinePrefix = options.linePrefix + options.indent;
				const innerLinePrefixLength = options.linePrefixLength + options.indentLength;
				let joined = `\n${obj.map((entry): string => (
					`${options.linePrefix}- ${convertObjectToReadableFormat(entry, {
						maxArrayEntries: options.maxArrayEntries,
						currentLineLength: innerLinePrefix.length,
						linePrefix: innerLinePrefix,
						linePrefixLength: innerLinePrefixLength,
						indent: options.indent,
						indentLength: options.indentLength,
						startObjectOnNewline: false
					})}`
				)).join('\n')}`;
				return joined;
			} else {
				// Object
				const innerLinePrefix = options.linePrefix + options.indent;
				const innerLinePrefixLength = options.linePrefixLength + options.indentLength;
				const parts: string[] = [ ];
				let firstLine = true;
				for(const key in obj) {
					const val = obj[key];
					let formattedKey = key;
					// TODO if the key contains invalid characters, JSON.stringify it
					let line = `${(!firstLine || options.startObjectOnNewline) ? options.linePrefix : ''}${formattedKey}: ${convertObjectToReadableFormat(val, {
						maxArrayEntries: options.maxArrayEntries,
						currentLineLength: (innerLinePrefix.length + formattedKey.length + 2),
						linePrefix: innerLinePrefix,
						linePrefixLength: innerLinePrefixLength,
						indent: options.indent,
						indentLength: options.indentLength,
						startObjectOnNewline: true
					})}`;
					parts.push(line);
					firstLine = false;
				}
				let joined = parts.join('\n');
				if(options.startObjectOnNewline) {
					joined = '\n' + joined;
				}
				return joined;
			}
	}
	console.error(`Unknown type ${objType}`);
	return JSON.stringify(obj);
}
