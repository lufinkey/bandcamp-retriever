
export type ErrorCode_Http = `BANDCAMP:HTTP${number}`;
export const ErrorCode_NoFileContent = `LETTERBOXD:NOFILECONTENT`;
export const ErrorCode_RequestFailed = `BANDCAMP:REQUESTFAILED`;
export type ErrorCode = ErrorCode_Http | typeof ErrorCode_NoFileContent | typeof ErrorCode_RequestFailed;

export type BandcampError = Error & {
	code: ErrorCode;
	url: string;
	httpResponse?: Response;
	description?: string;
};

export const bandcampRequestFailed = (url: string, res: Response, message?: string): BandcampError => {
	let errorMessage: string;
	let errorCode: ErrorCode;
	if(res.status >= 200 && res.status < 300) {
		errorMessage = message || "Request failed";
		errorCode = ErrorCode_RequestFailed;
	} else {
		errorMessage = message || res.statusText;
		errorCode = `BANDCAMP:HTTP${res.status}`;
	}
	const error = new Error(errorMessage) as BandcampError;
	error.code = errorCode;
	error.url = url;
	error.httpResponse = res;
	return error;
};

export const bandcampHttpError = (url: string, res: Response, message?: string): BandcampError => {
	const error = new Error(message || res.statusText) as BandcampError;
	error.code = `BANDCAMP:HTTP${res.status}`;
	error.url = url;
	error.httpResponse = res;
	return error;
};

export const bandcampNoFileContentError = (url: string, res: Response): BandcampError => {
	let errorMessage: string;
	let errorCode: ErrorCode;
	if(res.status >= 200 && res.status < 300) {
		errorMessage = "No file content";
		errorCode = ErrorCode_NoFileContent;
	} else {
		errorMessage = res.statusText;
		errorCode = `BANDCAMP:HTTP${res.status}`;
	}
	const error = new Error(errorMessage) as BandcampError;
	error.code = errorCode;
	error.url = url;
	error.httpResponse = res;
	return error;
};
