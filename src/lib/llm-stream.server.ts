import {
	chatParamsFromRequestBody,
	memoryStream,
	RUN_CANCEL_REASON,
	type RunStore,
	resolveResumeRunId,
	resumeServerSentEventsResponse,
	type StreamChunk,
	type StreamDurability,
	toServerSentEventsResponse,
	wasCancelRequested,
} from "@tanstack/ai";
import { BodyTooLargeError, readJsonWithLimit } from "#/lib/http.server";

type RunParams = Awaited<ReturnType<typeof chatParamsFromRequestBody>>;

/** Reads a chat run request. Bad input returns an error response (413 or 400) instead of throwing. */
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
 * The request's durability log, pinned to the authorized `runId` so a `Last-Event-ID`
 * cannot select another run. `null` when the offset does not parse.
 */
function pinnedDurability({
	request,
	runId,
}: {
	request: Request;
	runId: string;
}): StreamDurability | null {
	let offset: string | null;
	try {
		offset = memoryStream(request).resumeFrom();
	} catch {
		return null;
	}
	return memoryStream({ runId, offset });
}

/**
 * Streams a run as SSE with a durability log. A disconnect keeps the run going so the
 * client can reconnect; it aborts only when the user pressed Stop. Errors reach the
 * client as a final `RUN_ERROR` event.
 */
export function streamRunResponse({
	request,
	run,
	runId,
	runs,
}: {
	request: Request;
	run: (abortController: AbortController) => AsyncIterable<StreamChunk>;
	runId: string;
	runs: RunStore;
}): Response {
	const durability = pinnedDurability({ request, runId });
	if (!durability) return new Response("Bad request", { status: 400 });

	const abortController = new AbortController();
	if (request.signal.aborted) abortController.abort();
	else {
		request.signal.addEventListener("abort", () => {
			void wasCancelRequested(runs, runId).then((cancelled) => {
				if (cancelled) abortController.abort(RUN_CANCEL_REASON);
			});
		});
	}

	return toServerSentEventsResponse(run(abortController), {
		abortController,
		// The default batch holds back 32 chunks per append, so text would arrive in bursts.
		durability: { adapter: durability, batch: 1 },
	});
}

/**
 * Reconnects a client to a running stream. The request names only a run, so the run's
 * thread is looked up and authorized first; a request without a run id is refused.
 */
export async function resumeRunResponse({
	request,
	findThreadId,
	authorize,
}: {
	request: Request;
	findThreadId: (params: { runId: string }) => Promise<string | null>;
	authorize: (threadId: string) => Promise<boolean>;
}): Promise<Response> {
	const runId = resolveResumeRunId(request);
	if (!runId) return new Response("Bad request", { status: 400 });
	const threadId = await findThreadId({ runId });
	if (!threadId || !(await authorize(threadId))) {
		return new Response("Forbidden", { status: 403 });
	}
	const durability = pinnedDurability({ request, runId });
	if (!durability) return new Response("Bad request", { status: 400 });
	return resumeServerSentEventsResponse({ adapter: durability });
}
