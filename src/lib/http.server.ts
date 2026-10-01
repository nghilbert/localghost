import { formatBytes } from "#/lib/format";

/** Thrown when a request body exceeds the caller's byte limit. */
export class BodyTooLargeError extends Error {
	constructor(maxBytes: number) {
		super(`Request body exceeds the ${formatBytes(maxBytes)} limit.`);
	}
}

/**
 * Parses a request's JSON body, stopping as soon as it exceeds `maxBytes`. The size is
 * checked while streaming too, since a chunked body can omit `Content-Length`.
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
