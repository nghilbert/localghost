import {
	chatParamsFromRequestBody,
	memoryStream,
	type StreamChunk,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { EventType } from "@tanstack/ai/client";
import { BodyTooLargeError, readJsonWithLimit } from "#/shared/lib/http.server";

type RunParams = Awaited<ReturnType<typeof chatParamsFromRequestBody>>;

/**
 * Reads an AG-UI run request, turning every malformed-input case into a status
 * rather than a throw: too large is 413, unparseable JSON and a body that isn't an
 * AG-UI run are both 400.
 */
export async function readRunParams({
	request,
	maxBytes,
}: {
	request: Request;
	maxBytes: number;
}): Promise<{ ok: true; params: RunParams } | { ok: false; response: Response }> {
	let body: unknown;
	try {
		body = await readJsonWithLimit({ request, maxBytes });
	} catch (err) {
		if (err instanceof BodyTooLargeError) {
			return { ok: false, response: new Response(err.message, { status: 413 }) };
		}
		return { ok: false, response: new Response("Invalid JSON", { status: 400 }) };
	}
	try {
		return { ok: true, params: await chatParamsFromRequestBody(body) };
	} catch {
		return { ok: false, response: new Response("Bad request", { status: 400 }) };
	}
}

/**
 * Streams a run as SSE. One controller cancels everything when the client drops the
 * connection, so nothing keeps generating against a listener that has gone away, and
 * a thrown error arrives as a terminal `RUN_ERROR` chunk rather than a cut stream.
 */
export function streamRunResponse({
	request,
	run,
	errorMessage,
}: {
	request: Request;
	run: (abortController: AbortController) => AsyncIterable<StreamChunk>;
	errorMessage: string;
}): Response {
	const abortController = new AbortController();
	if (request.signal.aborted) abortController.abort();
	else request.signal.addEventListener("abort", () => abortController.abort());

	async function* withErrorHandling(): AsyncGenerator<StreamChunk> {
		try {
			for await (const chunk of run(abortController)) {
				yield chunk;
			}
		} catch (err) {
			yield {
				type: EventType.RUN_ERROR,
				message: err instanceof Error ? err.message : errorMessage,
			};
		}
	}

	return toServerSentEventsResponse(withErrorHandling(), {
		abortController,
		durability: { adapter: memoryStream(request) },
	});
}
