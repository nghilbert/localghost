/** Clicks a transient anchor to trigger a browser download. */
function clickDownload(href: string, filename: string) {
	const a = Object.assign(document.createElement("a"), { href, download: filename });
	a.click();
}

/**
 * Downloads in-memory content as a file via a temporary object URL.
 *
 * @param filename - Suggested name for the saved file.
 * @param content - The file body.
 * @param type - MIME type for the blob (defaults to plain text).
 */
export function downloadBlob(filename: string, content: BlobPart, type = "text/plain") {
	const url = URL.createObjectURL(new Blob([content], { type }));
	clickDownload(url, filename);
	URL.revokeObjectURL(url);
}

/**
 * Triggers a download of a server endpoint; the server names the file via its
 * `Content-Disposition` header when `filename` is left empty.
 */
export function downloadUrl(href: string, filename = "") {
	clickDownload(href, filename);
}
