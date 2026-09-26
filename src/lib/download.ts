/** Triggers a browser download of in-memory text as a named file. */
export function downloadTextFile({
	filename,
	text,
	type,
}: {
	filename: string;
	text: string;
	type: string;
}): void {
	const url = URL.createObjectURL(new Blob([text], { type }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}
