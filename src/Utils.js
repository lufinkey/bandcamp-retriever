
const { Buffer } = require('buffer');
const { XMLHttpRequest } = require('./external/XMLHttpRequest');


module.exports.sendHttpRequest = (url, options) => {
	options = {...options};
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.responseType = 'arraybuffer';
		xhr.onreadystatechange = () => {
			if(xhr.readyState === 4) {
				const data = Buffer.from((xhr.response != null) ? xhr.response : xhr.responseText);
				resolve({ data });
			}
		};
		xhr.onerror = (error) => {
			reject(error);
		};
		xhr.open(options.method || 'GET', url);
		if(options.body) {
			xhr.send(options.body);
		}
		else {
			xhr.send();
		}
	});
}

module.exports.getDurationFromText = (durationText) => {
	const durationParts = durationText.split(':');
	let durationPart = null;
	let duration = 0;
	let partCount = 0;
	while(durationPart = durationParts.pop()) {
		if(durationPart.length == 0) {
			continue;
		}
		const durationPartNum = parseInt(durationPart);
		if(isNaN(durationPartNum)) {
			return null;
		}
		switch(partCount) {
			case 0:
				duration += durationPartNum;
				break;

			case 1:
				duration += durationPartNum * 60;
				break;

			case 2:
				duration += durationPartNum * 60 * 60;
				break;
		}
		partCount += 1;
	}
	return duration;
}