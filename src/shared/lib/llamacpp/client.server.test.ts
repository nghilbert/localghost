import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	deleteModel,
	downloadModel,
	listModels,
	openModelEventStream,
	unloadModel,
} from "#/shared/lib/llamacpp/client.server";

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

const fetchMock = vi.fn();

// The event stream goes through undici (for its `bodyTimeout: 0` agent), not global fetch.
const { undiciFetchMock } = vi.hoisted(() => ({ undiciFetchMock: vi.fn() }));
vi.mock("undici", async (importOriginal) => ({
	...(await importOriginal<typeof import("undici")>()),
	fetch: undiciFetchMock,
}));

beforeEach(() => {
	fetchMock.mockReset();
	undiciFetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("llama.cpp model status", () => {
	it("parses installed, sleeping, and multi-file downloading states", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
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
				}),
			),
		);

		await expect(listModels({ url: "http://localhost:8080", apiKey: "secret" })).resolves.toEqual([
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
		expect(fetchMock).toHaveBeenCalledWith(
			"http://localhost:8080/models",
			expect.objectContaining({ headers: { Authorization: "Bearer secret" } }),
		);
	});

	// "downloaded" is the one-poll-wide state the router reports between a finished
	// download and its next reload (tools/server/server-models.h, SERVER_MODEL_STATUS_DOWNLOADED);
	// listModels used to throw on it, which probeRuntime then swallowed into "unreachable".
	it("parses the transient downloaded state", async () => {
		fetchMock.mockResolvedValue(
			new Response(
				JSON.stringify({
					data: [{ id: "org/just-finished:Q4_K_M", status: { value: "downloaded" } }],
				}),
			),
		);

		await expect(listModels({ url: "http://localhost:8080" })).resolves.toEqual([
			{ id: "org/just-finished:Q4_K_M", status: { value: "downloaded" } },
		]);
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
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
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
		expect(warn).toHaveBeenCalledOnce();

		controller.abort();
		warn.mockRestore();
	});

	it("stops reconnecting once the caller aborts", async () => {
		undiciFetchMock.mockResolvedValueOnce(
			new Response(droppedStream("first"), { headers: { "Content-Type": "text/event-stream" } }),
		);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
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
		warn.mockRestore();
	});
});

describe("llama.cpp model mutations", () => {
	it("surfaces the router's download error", async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ error: { message: "model is gated" } }), { status: 403 }),
		);

		await expect(
			downloadModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("model is gated");
	});

	it("surfaces cancel and delete failures", async () => {
		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: "download not active" } }), { status: 404 }),
		);
		await expect(
			unloadModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("download not active");

		fetchMock.mockResolvedValueOnce(
			new Response(JSON.stringify({ error: { message: "model is loaded" } }), { status: 409 }),
		);
		await expect(
			deleteModel({ url: "http://localhost:8080", model: "org/model:Q4_K_M" }),
		).rejects.toThrow("model is loaded");
		expect(fetchMock).toHaveBeenLastCalledWith(
			"http://localhost:8080/models?model=org%2Fmodel%3AQ4_K_M",
			{ method: "DELETE", headers: {} },
		);
	});
});
