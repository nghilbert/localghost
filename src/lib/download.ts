/** Clicks a transient anchor to trigger a browser download. */
function clickDownload(href: string, filename: string) {
	const a = Object.assign(document.createElement("a"), { href, download: filename });
	a.click();
}

/**
 * Triggers a download of a server endpoint; the server names the file via its
 * `Content-Disposition` header when `filename` is left empty.
 */
export function downloadUrl(href: string, filename = "") {
	clickDownload(href, filename);
}
