import { http, HttpResponse } from "msw";
import type { fetch as undiciFetch } from "undici";
import { beforeEach, describe, expect, vi } from "vitest";
import {
	deleteModel,
	downloadModel,
	listModels,
	LOCAL_LLAMACPP_API_KEY,
	openModelEventStream,
	unloadModel,
	type LlamaError,
	type LlamaModelList,
} from "#/lib/llamacpp/client.server";
import { log } from "#/lib/log.server";
import { it, network } from "#/test/network.server";

/**
 * A `ReadableStream<Uint8Array>` that emits `chunk` then errors instead of closing cleanly.
 * Errors on the *next* pull (not alongside the enqueue) since erroring a stream clears its
 * queue, which would otherwise discard `chunk` before a reader ever sees it.
 */
function droppedStream(chunk: string): ReadableStream<Uint8Array> {
	let delivered = false;
	return new ReadableStream({
		pull(controller) {
			if (!delivered) {
				delivered = true;
				controller.enqueue(new TextEncoder().encode(chunk));
				return;
			}
			controller.error(new Error("socket hang up"));
		},
	});
}

const ROUTER = "http://localhost:8080";

/** Serves the model list and returns the Authorization headers it was requested with. */
function serveModelList(body: LlamaModelList): Array<string | null> {
	const authorizations: Array<string | null> = [];
	network.use(
		http.get(`${ROUTER}/models`, ({ request }) => {
			authorizations.push(request.headers.get("Authorization"));
			return HttpResponse.json(body);
		}),
	);
	return authorizations;
}

function routerError({ message, status }: { message: string; status: number }): Response {
	return HttpResponse.json({ error: { message } } satisfies LlamaError, { status });
}

// The event stream goes through undici (for its `bodyTimeout: 0` agent), not global fetch.
const { undiciFetchMock } = vi.hoisted(() => ({
	undiciFetchMock: vi.fn<(...args: Parameters<typeof undiciFetch>) => Promise<Response>>(),
}));
vi.mock("undici", async (importOriginal) => ({
	...(await importOriginal<typeof import("undici")>()),
	fetch: undiciFetchMock,
}));

beforeEach(() => {
	undiciFetchMock.mockReset();
});

describe("llama.cpp model status", () => {
	it("parses installed, sleeping, and multi-file downloading states", async () => {
		const authorizations = serveModelList({
			data: [
				{ id: "org/ready:Q4_K_M", status: { value: "sleeping" } },
				{
					id: "org/downloading:Q4_K_M",
					status: {
						value: "downloading",
						progress: {
							one: { done: 4, total: 10 },
							two: { done: 8, total: 20 },
						},
					},
				},
			],
		});

		await expect(listModels({ url: ROUTER, apiKey: "secret" })).resolves.toEqual([
			{ id: "org/ready:Q4_K_M", status: { value: "sleeping" } },
			{
				id: "org/downloading:Q4_K_M",
				status: {
					value: "downloading",
					progress: {
						one: { done: 4, total: 10 },
						two: { done: 8, total: 20 },
					},
				},
			},
		]);
		expect(authorizations).toEqual(["Bearer secret"]);
	});

	// The router reports this between a finished download and its next reload.
	it("parses the transient downloaded state", async () => {
		serveModelList({ data: [{ id: "org/just-finished:Q4_K_M", status: { value: "downloaded" } }] });

		await expect(listModels({ url: "http://localhost:8080" })).resolves.toEqual([
			{ id: "org/just-finished:Q4_K_M", status: { value: "downloaded" } },
		]);
	});

	it("falls back to the bundled key when the endpoint stores none", async () => {
		const authorizations = serveModelList({ data: [] });

		await listModels({ url: ROUTER });

		expect(authorizations).toEqual([`Bearer ${LOCAL_LLAMACPP_API_KEY}`]);
	});

	it("opens the authenticated model event stream with the caller's abort signal", async () => {
		undiciFetchMock.mockResolvedValue(
			new Response("data: {}\n\n", { headers: { "Content-Type": "text/event-stream" } }),
		);
		const controller = new AbortController();

		const body = await openModelEventStream({
			url: "http://localhost:8080",
			apiKey: "secret",
			signal: controller.signal,
		});

		expect(body).toBeInstanceOf(ReadableStream);
		expect(undiciFetchMock).toHaveBeenCalledWith(
			"http://localhost:8080/models/sse",
			expect.objectContaining({
				headers: { Accept: "text/event-stream", Authorization: "Bearer secret" },
				signal: controller.signal,
			}),
		);

		// Nothing reads `body`, but its internal reconnect loop runs regardless: abort so it
		// doesn't keep retrying against the shared `undiciFetchMock` in the background after this test ends.
		controller.abort();
	});

	it("reconnects when the upstream event stream drops mid-flight", async () => {
		const secondBody = new ReadableStream<Uint8Array>({
			start(streamController) {
				streamController.enqueue(new TextEncoder().encode("second"));
			},
		});
		undiciFetchMock
			.mockResolvedValueOnce(
				new Response(droppedStream("first"), { headers: { "Content-Type": "text/event-stream" } }),
			)
			.mockResolvedValueOnce(
				new Response(secondBody, { headers: { "Content-Type": "text/event-stream" } }),
			);
		const debug = vi.spyOn(log, "debug").mockReturnValue();
		const controller = new AbortController();

		const body = await openModelEventStream({
			url: "http://localhost:8080",
			signal: controller.signal,
		});
		const reader = body.getReader();
		const decoder = new TextDecoder();

		expect(decoder.decode((await reader.read()).value)).toBe("first");
		expect(decoder.decode((await reader.read()).value)).toBe("second");
		expect(undiciFetchMock).toHaveBeenCalledTimes(2);
		expect(debug).toHaveBeenCalledOnce();

		controller.abort();
	});

	it("stops reconnecting once the caller aborts", async () => {
		undiciFetchMock.mockResolvedValueOnce(
			new Response(droppedStream("first"), { headers: { "Content-Type": "text/event-stream" } }),
		);
		vi.spyOn(log, "debug").mockReturnValue();
		const controller = new AbortController();

		const body = await openModelEventStream({
			url: "http://localhost:8080",
			signal: controller.signal,
		});
		const reader = body.getReader();

		await reader.read();
		controller.abort();
		const { done } = await reader.read();

		expect(done).toBe(true);
		expect(undiciFetchMock).toHaveBeenCalledTimes(1);
	});
});

describe("llama.cpp model mutations", () => {
	it("surfaces the router's download error", async () => {
		network.use(
			http.post(`${ROUTER}/models`, () => routerError({ message: "model is gated", status: 403 })),
		);

		await expect(downloadModel({ url: ROUTER, model: "org/model:Q4_K_M" })).rejects.toThrow(
			"model is gated",
		);
	});

	it("surfaces cancel and delete failures", async () => {
		const deleted: Array<{ url: string; authorization: string | null }> = [];
		network.use(
			http.post(`${ROUTER}/models/unload`, () =>
				routerError({ message: "download not active", status: 404 }),
			),
			http.delete(`${ROUTER}/models`, ({ request }) => {
				deleted.push({
					url: request.url,
					authorization: request.headers.get("Authorization"),
				});
				return routerError({ message: "model is loaded", status: 409 });
			}),
		);

		await expect(unloadModel({ url: ROUTER, model: "org/model:Q4_K_M" })).rejects.toThrow(
			"download not active",
		);
		await expect(deleteModel({ url: ROUTER, model: "org/model:Q4_K_M" })).rejects.toThrow(
			"model is loaded",
		);
		// No stored key, so the bundled server's key rides along.
		expect(deleted).toEqual([
			{
				url: `${ROUTER}/models?model=org%2Fmodel%3AQ4_K_M`,
				authorization: `Bearer ${LOCAL_LLAMACPP_API_KEY}`,
			},
		]);
	});
});
