import {
	chatParamsFromRequestBody,
	memoryStream,
	RUN_CANCEL_REASON,
	type RunStore,
	resolveResumeRunId,
	resumeServerSentEventsResponse,
	type StreamChunk,
	toServerSentEventsResponse,
	wasCancelRequested,
} from "@tanstack/ai";
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
 * Streams a run as SSE. With durability on, a disconnect alone never aborts the
 * generation (it runs on for a `?offset` rejoin), so this only aborts once
 * `wasCancelRequested` confirms the disconnect was a Stop, not a reload.
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
	const abortController = new AbortController();
	if (request.signal.aborted) abortController.abort();
	else {
		request.signal.addEventListener("abort", () => {
			wasCancelRequested(runs, runId).then((cancelled) => {
				if (cancelled) abortController.abort(RUN_CANCEL_REASON);
			});
		});
	}

	return toServerSentEventsResponse(run(abortController), {
		abortController,
		durability: { adapter: memoryStream(request) },
	});
}

/**
 * Serves a resumable-stream rejoin, authorizing the run it names against its thread's
 * owner first: a rejoin carries only a run id, not the thread id `authorize` needs, and
 * a leaked run id must not let another user replay a run's output.
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
	if (runId) {
		const threadId = await findThreadId({ runId });
		if (!threadId || !(await authorize(threadId)))
			return new Response("Forbidden", { status: 403 });
	}
	return resumeServerSentEventsResponse({ adapter: memoryStream(request) });
}
