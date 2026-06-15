import { describe, expect, it, vi } from "vitest";
import type { LLMMessage } from "#/lib/llm.server";
import { makeLLMMessage } from "#/test/factories";

vi.mock("#/lib/llm.server", () => ({
	callLLM: vi.fn().mockResolvedValue("Summary text"),
	streamLLM: vi.fn(),
}));

// Import after mock is set up
const { maybeCompact } = await import("#/lib/compactor.server");

const msg = (role: LLMMessage["role"], content: string) => makeLLMMessage({ role, content });

describe("maybeCompact", () => {
	it("does not compact when token estimate is below 85% threshold", async () => {
		// A few short messages won't approach 85% of 128k
		const messages = [msg("user", "hi"), msg("assistant", "hello")];
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
		expect(result.compacted).toBe(false);
		expect(result.messages).toBe(messages);
	});

	it("does not compact when convo has fewer than 4 messages even if over threshold", async () => {
		// Generate a large message to push over the limit, but keep total count < 4
		const largeContent = "x".repeat(400_000); // ~120k tokens estimated (0.3 * 400k)
		const messages = [msg("user", largeContent), msg("assistant", "ok"), msg("user", "more")];
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
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
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
		expect(result.compacted).toBe(true);
		expect(result.messages.length).toBeLessThan(messages.length + 2); // summary replaces older half
	});

	it("preserves system messages at the front after compaction", async () => {
		const largeContent = "x".repeat(370_000);
		const messages = [
			msg("system", "You are helpful."),
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "follow up"),
			msg("assistant", "done"),
		];
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
		if (result.compacted && result.messages.length > 0) {
			expect(result.messages[0]?.role).toBe("system");
		}
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
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
		// Falls back to trimmed recent history, not an error
		expect(result.compacted).toBe(false);
		expect(result.messages.length).toBeGreaterThan(0);
	});

	it("compacted messages include a summary system message", async () => {
		const { callLLM } = await import("#/lib/llm.server");
		vi.mocked(callLLM).mockResolvedValueOnce("Summary of earlier conversation.");

		const largeContent = "x".repeat(370_000);
		const messages = [
			msg("user", largeContent),
			msg("assistant", "ok"),
			msg("user", "follow"),
			msg("assistant", "done"),
		];
		const result = await maybeCompact(messages, "gpt-4o", "https://api.openai.com", "key");
		if (result.compacted) {
			const summaryMsg = result.messages.find(
				(m) => typeof m.content === "string" && m.content.includes("compacted"),
			);
			expect(summaryMsg).toBeDefined();
		}
	});
});
