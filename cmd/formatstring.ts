
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
					const varName = formatString.substring(varNameStartIndex, varNameEndIndex);
					const varVal = vars[varName];
					if(varVal === undefined) {
						throw new Error(`Invalid variable ${varName} at index ${varStartIndex}`);
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
