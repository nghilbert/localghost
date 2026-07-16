/** Thrown when a request body exceeds the caller's byte limit. */
export class BodyTooLargeError extends Error {
	constructor(maxBytes: number) {
		super(`Request body exceeds the ${Math.round(maxBytes / (1024 * 1024))} MB limit.`);
	}
}

/**
 * Parses a request's JSON body while enforcing a byte cap, so an oversized
 * upload is rejected instead of buffered whole. Rejects early on a declared
 * `Content-Length` over the cap and enforces it again while streaming, since a
 * chunked body can omit the header.
 * @throws {BodyTooLargeError} When the body exceeds `maxBytes`.
 * @throws {SyntaxError} When the body is not valid JSON.
 */
export async function readJsonWithLimit({
	request,
	maxBytes,
}: {
	request: Request;
	maxBytes: number;
}): Promise<unknown> {
	const declared = Number(request.headers.get("content-length"));
	if (Number.isFinite(declared) && declared > maxBytes) throw new BodyTooLargeError(maxBytes);
	if (!request.body) return JSON.parse("");

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let received = 0;
	for (let read = await reader.read(); !read.done; read = await reader.read()) {
		received += read.value.byteLength;
		if (received > maxBytes) {
			await reader.cancel();
			throw new BodyTooLargeError(maxBytes);
		}
		chunks.push(read.value);
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
