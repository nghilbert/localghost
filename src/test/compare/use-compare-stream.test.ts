import { describe, expect, it } from "vitest";
import { reduceSlot, type SlotChunk } from "#/features/compare/hooks/use-compare-stream";
import type { SlotState } from "#/features/compare/lib/types";

const EMPTY: SlotState = { text: "", done: false, error: null };

function reduceAll(chunks: SlotChunk[]): SlotState {
	return chunks.reduce(reduceSlot, EMPTY);
}

describe("reduceSlot", () => {
	it("accumulates text deltas in order", () => {
		const state = reduceAll([
			{ type: "text", delta: "Hello" },
			{ type: "text", delta: ", " },
			{ type: "text", delta: "world" },
		]);
		expect(state).toEqual({ text: "Hello, world", done: false, error: null });
	});

	it("marks the slot done on the terminal chunk", () => {
		const state = reduceAll([{ type: "text", delta: "Hi" }, { type: "done" }]);
		expect(state).toEqual({ text: "Hi", done: true, error: null });
	});

	it("records an error and marks the slot done", () => {
		const state = reduceAll([
			{ type: "text", delta: "partial" },
			{ type: "error", message: "model unavailable" },
		]);
		expect(state).toEqual({ text: "partial", done: true, error: "model unavailable" });
	});

	it("does not mutate the accumulator", () => {
		const acc: SlotState = { text: "x", done: false, error: null };
		const next = reduceSlot(acc, { type: "text", delta: "y" });
		expect(acc).toEqual({ text: "x", done: false, error: null });
		expect(next).toEqual({ text: "xy", done: false, error: null });
	});
});
