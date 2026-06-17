import type { ModelMessage } from "@tanstack/ai";
import { describe, expect, it, vi } from "vitest";
import { makeModelMessage } from "#/test/factories";

vi.mock("#/lib/llm.server", () => ({
	callLLM: vi.fn().mockResolvedValue("Summary text"),
	streamLLM: vi.fn(),
}));

// Import after mock is set up
const { maybeCompact } = await import("#/lib/compactor.server");

const msg = (role: ModelMessage["role"], content: string) => makeModelMessage({ role, content });

describe("maybeCompact", () => {
	it("does not compact when token estimate is below 85% threshold", async () => {
		// A few short messages won't approach 85% of 128k
		const messages = [msg("user", "hi"), msg("assistant", "hello")];
		const result = await maybeCompact(
			messages,
			undefined,
			"gpt-4o",
			"https://api.openai.com",
			"key",
		);
		expect(result.compacted).toBe(false);
		expect(result.messages).toBe(messages);
	});

	it("does not compact when convo has fewer than 4 messages even if over threshold", async () => {
		// Generate a large message to push over the limit, but keep total count < 4
		const largeContent = "x".repeat(400_000); // ~120k tokens estimated (0.3 * 400k)
		const messages = [msg("user", largeContent), msg("assistant", "ok"), msg("user", "more")];
		const result = await maybeCompact(
			messages,
			undefined,
			"gpt-4o",
			"https://api.openai.com",
			"key",
		);
		expect(result.compacted).toBe(false);
	});

	it("compacts when messages exceed threshold and count ≥ 4", async () => {
		const largeContent = "x".repeat(370_000); // pushes over 85% of 128k
		const messages = [
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "follow up"),
			msg("assistant", "done"),
		];
		const result = await maybeCompact(
			messages,
			undefined,
			"gpt-4o",
			"https://api.openai.com",
			"key",
		);
		expect(result.compacted).toBe(true);
		expect(result.messages.length).toBeLessThan(messages.length); // older half is summarized away
	});

	it("folds the summary into the system prompt after compaction", async () => {
		const { callLLM } = await import("#/lib/llm.server");
		vi.mocked(callLLM).mockResolvedValueOnce("Summary of earlier conversation.");

		const largeContent = "x".repeat(370_000);
		const messages = [
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "follow up"),
			msg("assistant", "done"),
		];
		const result = await maybeCompact(
			messages,
			"You are helpful.",
			"gpt-4o",
			"https://api.openai.com",
			"key",
		);
		expect(result.compacted).toBe(true);
		expect(result.systemPrompt).toContain("You are helpful.");
		expect(result.systemPrompt).toContain("compacted");
	});

	it("uses claude model context length (200k) instead of default", async () => {
		// With 200k context, the same large message won't trigger compaction
		const largeContent = "x".repeat(370_000); // ~111k tokens — over 85% of 128k but under 85% of 200k
		const messages = [
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "q"),
			msg("assistant", "a"),
		];
		const result = await maybeCompact(
			messages,
			undefined,
			"claude-sonnet-4-6",
			"https://api.anthropic.com",
			"key",
		);
		expect(result.compacted).toBe(false);
	});

	it("falls back gracefully when callLLM throws", async () => {
		const { callLLM } = await import("#/lib/llm.server");
		vi.mocked(callLLM).mockRejectedValueOnce(new Error("API error"));

		const largeContent = "x".repeat(370_000);
		const messages = [
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "follow"),
			msg("assistant", "done"),
		];
		const result = await maybeCompact(
			messages,
			undefined,
			"gpt-4o",
			"https://api.openai.com",
			"key",
		);
		// Falls back to trimmed recent history, not an error
		expect(result.compacted).toBe(false);
		expect(result.messages.length).toBeGreaterThan(0);
	});
});
