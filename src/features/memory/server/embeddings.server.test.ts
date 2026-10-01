import type { CreateEmbeddingResponse } from "openai/resources";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encrypt } from "#/lib/crypto.server";
import { log } from "#/lib/log.server";
import { createEndpoint, createUser, resetDb } from "#/test/db.server";
import { embed, embeddingConfigFor, toVectorLiteral } from "./embeddings.server";

describe("embeddingConfigFor", () => {
	it("picks a local embedding GGUF on the OpenAI path for llamacpp, not the chat model", () => {
		const config = embeddingConfigFor("llamacpp");
		expect(config?.model).toBe("ggml-org/embeddinggemma-300M-GGUF:Q8_0");
		expect(config?.baseUrl("http://localhost:8080")).toBe("http://localhost:8080/v1");
	});

	it("picks an OpenAI-compatible embedding model for openai/openrouter/groq", () => {
		expect(embeddingConfigFor("openai")?.model).toBe("text-embedding-3-small");
		expect(embeddingConfigFor("openrouter")?.model).toBe("text-embedding-3-small");
		expect(embeddingConfigFor("groq")?.baseUrl("https://api.groq.com/openai/v1")).toBe(
			"https://api.groq.com/openai/v1",
		);
	});

	it("embeds Gemini via its OpenAI-compatible surface", () => {
		const config = embeddingConfigFor("gemini");
		expect(config?.model).toBe("text-embedding-004");
		expect(config?.baseUrl("https://generativelanguage.googleapis.com/v1beta")).toBe(
			"https://generativelanguage.googleapis.com/v1beta/openai",
		);
	});

	it("returns null for providers with no embeddings endpoint", () => {
		expect(embeddingConfigFor("anthropic")).toBeNull();
		expect(embeddingConfigFor(undefined)).toBeNull();
	});
});

describe("embed", () => {
	beforeEach(async () => {
		await resetDb();
		vi.spyOn(log, "error").mockImplementation(() => {});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				Response.json({
					object: "list",
					data: [{ object: "embedding", index: 0, embedding: [0.1, 0.2] }],
					model: "text-embedding-3-small",
					usage: { prompt_tokens: 1, total_tokens: 1 },
				} satisfies CreateEmbeddingResponse),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("skips an endpoint whose key can't be decrypted and uses the next one", async () => {
		const user = await createUser();
		// Not a valid `iv:tag:ciphertext` triple, so decrypt() throws and endpointApiKey
		// wraps it in the "re-enter the key" error embed() catches and skips past.
		await createEndpoint({
			ownerId: user.id,
			url: "https://one.test",
			provider: "openai",
			apiKeyEncrypted: "corrupt",
		});
		await createEndpoint({
			ownerId: user.id,
			url: "https://two.test",
			provider: "openai",
			apiKeyEncrypted: encrypt("plain-key"),
		});

		await expect(embed({ text: "hello", ownerId: user.id })).resolves.toEqual([0.1, 0.2]);

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://two.test/v1/embeddings");
	});
});

describe("toVectorLiteral", () => {
	it("formats an empty array", () => {
		expect(toVectorLiteral([])).toBe("[]");
	});

	it("formats a single-element array", () => {
		expect(toVectorLiteral([0.5])).toBe("[0.5]");
	});

	it("formats a multi-element array", () => {
		expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe("[0.1,0.2,0.3]");
	});

	it("preserves floating-point precision", () => {
		const v = [1.234567890123456, -0.000001, 0.9999999];
		const literal = toVectorLiteral(v);
		expect(literal).toMatch(/^\[[\d.,e+-]+\]$/);
		const parsed: number[] = JSON.parse(literal);
		expect(parsed).toHaveLength(3);
	});
});
