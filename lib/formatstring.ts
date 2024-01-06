
export function resolveFormatString(formatString: string, vars: { [key: string]: any }): string {
	const parts: string[] = [];
	let lastStartIndex = 0;
	for(let i=0; i<formatString.length; i++) {
		const c = formatString[i];
		if(c == '%') {
			if(i != (formatString.length - 1)) {
				const c2 = formatString[i+1];
				if(c2 == '(') {
					// parse format variable
					const varStartIndex = i;
					i += 2;
					const varNameStartIndex = i;
					const varNameEndIndex = formatString.indexOf(')', varNameStartIndex);
					if(varNameEndIndex == -1) {
						throw new Error(`Missing end parenthesis for format variable at index ${varStartIndex}`);
					}
					let varName = formatString.substring(varNameStartIndex, varNameEndIndex);
					// slice variable format section
					const suffixStartIndex = varName.indexOf(':');
					let varFormat: (string | undefined) = undefined;
					if(suffixStartIndex != -1) {
						varFormat = varName.substring(suffixStartIndex+1);
						varName = varName.substring(0, suffixStartIndex);
					}
					let varVal = vars[varName];
					if(varVal === undefined) {
						throw new Error(`Missing variable ${varName} at index ${varStartIndex}`);
					}
					// format value if needed
					if(varFormat != null) {
						if(varFormat.length > 0) {
							try {
								const formatType = varFormat[0];
								switch(formatType) {
									case 'd':
									case 'D':
										if(typeof varVal === 'number') {
											let frontLength: string | undefined;
											let backLength: string | undefined;
											const dotIndex = varFormat.indexOf('.', 1);
											if(dotIndex == -1) {
												frontLength = varFormat.substring(1);
												backLength = undefined;
											} else {
												frontLength = varFormat.substring(1, dotIndex);
												backLength = varFormat.substring(dotIndex+1);
											}
											if (backLength) {
												// pad with zeros or trim
												const len = parseInt(backLength);
												let varValStr = varVal.toFixed(len);
												if(formatType == 'd') {
													// trim trailing zeroes
													const dotIndex = varValStr.indexOf('.');
													if(dotIndex != -1) {
														let endIndex = varValStr.length;
														while(varValStr[endIndex-1] == '0') {
															endIndex--;
														}
														varValStr = varValStr.substring(0, endIndex);
													}
												}
												varVal = varValStr;
											}
											if(frontLength) {
												// pad front with zeros if needed
												const len = parseInt(frontLength);
												let varValStr: string = (typeof varVal === 'string') ? varVal : varVal.toString();
												let dotIndex = varValStr.indexOf('.');
												if(dotIndex == -1) {
													dotIndex = varValStr.length;
												}
												if(dotIndex < len) {
													varValStr = varValStr.padStart(len, '0');
												}
												varVal = varValStr;
											}
										}
										break;
								}
							} catch(error) {
								throw new Error(`Invalid format string at index ${varNameStartIndex}`);
							}
						}
					}
					// append last part
					parts.push(formatString.substring(lastStartIndex, varStartIndex));
					parts.push(varVal);
					i = varNameEndIndex;
					lastStartIndex = varNameEndIndex + 1;
				} else if(c2 == '%') {
					// skip second %
					parts.push(formatString.substring(lastStartIndex, i+1));
					i++;
					lastStartIndex = i + 1;
				}
			}
		}
	}
	// append final part
	parts.push(formatString.substring(lastStartIndex));
	return parts.join('');
}
