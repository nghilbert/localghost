import { afterEach, describe, expect, it, vi } from "vitest";
import type { PullProgress } from "#/features/library/library.types";
import { reduceDownloadEvent, streamModelEvents } from "./download-stream";

describe("reduceDownloadEvent", () => {
	it("sums llama.cpp's parallel file progress into one entry per model", () => {
		const next = reduceDownloadEvent({
			byModel: {},
			event: {
				model: "org/model:Q4_K_M",
				event: "download_progress",
				data: { progress: { one: { done: 25, total: 100 }, two: { done: 12, total: 20 } } },
			},
		});

		expect(next).toEqual({
			"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
		});
	});

	it("keeps known bytes when a progress frame arrives with no files", () => {
		const known: Record<string, PullProgress> = {
			"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
		};

		const next = reduceDownloadEvent({
			byModel: known,
			event: { model: "org/model:Q4_K_M", event: "download_progress", data: { progress: {} } },
		});

		expect(next).toBe(known);
	});

	it.each(["download_finished", "download_failed", "model_remove"] as const)(
		"drops the model's entry on %s",
		(event) => {
			const next = reduceDownloadEvent({
				byModel: {
					"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
					"org/other:Q8_0": { status: "Downloading", completed: 5, total: 10 },
				},
				event: { model: "org/model:Q4_K_M", event },
			});

			expect(next).toEqual({
				"org/other:Q8_0": { status: "Downloading", completed: 5, total: 10 },
			});
		},
	);

	it("leaves the map alone for a model it is not tracking", () => {
		const known: Record<string, PullProgress> = {
			"org/model:Q4_K_M": { status: "Downloading", completed: 37, total: 120 },
		};

		expect(
			reduceDownloadEvent({
				byModel: known,
				event: { model: "org/absent:Q4_K_M", event: "status_change" },
			}),
		).toBe(known);
	});
});

class FakeEventSource {
	static current: FakeEventSource | undefined;
	static readonly CLOSED = 2;
	readonly url: string;
	readyState = 0;
	readonly close = vi.fn();
	onopen: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onmessage: ((message: { data: string }) => void) | null = null;

	constructor(url: string | URL) {
		this.url = String(url);
		FakeEventSource.current = this;
	}

	emit(payload: unknown) {
		this.onmessage?.({ data: typeof payload === "string" ? payload : JSON.stringify(payload) });
	}
}

/** Waits out the microtasks the generator needs to park on its wake-up promise. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
	FakeEventSource.current = undefined;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("streamModelEvents", () => {
	it("yields parsed events, skips junk, and closes the source when the signal aborts", async () => {
		vi.stubGlobal("EventSource", FakeEventSource);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const controller = new AbortController();
		const onOpen = vi.fn();
		const seen: string[] = [];

		const consumed = (async () => {
			for await (const event of streamModelEvents({
				endpointId: "endpoint-1",
				signal: controller.signal,
				onOpen,
			})) {
				seen.push(event.event);
			}
		})();

		await settle();
		const source = FakeEventSource.current;
		if (!source) throw new Error("expected an event source");
		expect(source.url).toBe("/api/models/events?endpointId=endpoint-1");

		source.onopen?.();
		expect(onOpen).toHaveBeenCalledOnce();

		source.emit("not json");
		source.emit({ model: "org/model:Q4_K_M", event: "not_a_real_event" });
		source.emit({
			model: "org/model:Q4_K_M",
			event: "download_progress",
			data: { progress: { one: { done: 1, total: 2 } } },
		});
		source.emit({ model: "org/model:Q4_K_M", event: "download_finished" });
		await settle();

		expect(seen).toEqual(["download_progress", "download_finished"]);
		expect(source.close).not.toHaveBeenCalled();

		controller.abort();
		await consumed;
		expect(source.close).toHaveBeenCalledOnce();
	});

	it("ends the stream when the browser gives up reconnecting", async () => {
		vi.stubGlobal("EventSource", FakeEventSource);
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const seen: string[] = [];

		const consumed = (async () => {
			for await (const event of streamModelEvents({
				endpointId: "endpoint-1",
				signal: new AbortController().signal,
			})) {
				seen.push(event.event);
			}
		})();

		await settle();
		const source = FakeEventSource.current;
		if (!source) throw new Error("expected an event source");

		source.readyState = FakeEventSource.CLOSED;
		source.onerror?.();

		await consumed;
		expect(seen).toEqual([]);
		expect(source.close).toHaveBeenCalledOnce();
	});
});
