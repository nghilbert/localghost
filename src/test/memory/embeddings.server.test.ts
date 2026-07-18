import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { decrypt, findMany } = vi.hoisted(() => ({ decrypt: vi.fn(), findMany: vi.fn() }));

vi.mock("#/shared/lib/crypto.server", () => ({ decrypt, encrypt: vi.fn() }));
vi.mock("#/shared/lib/db.server", () => ({ prisma: { endpoint: { findMany } } }));

import {
	embed,
	embeddingConfigFor,
	toVectorLiteral,
} from "#/shared/domain/memory/embeddings.server";

describe("embeddingConfigFor", () => {
	it("picks a local embedding model and the OpenAI path for ollama, not the chat model", () => {
		const config = embeddingConfigFor("ollama");
		expect(config?.model).toBe("nomic-embed-text");
		expect(config?.buildRequest({ url: "http://localhost:11434", text: "hi" }).url).toBe(
			"http://localhost:11434/v1/embeddings",
		);
	});

	it("picks an OpenAI-compatible embedding model for openai/openrouter/groq", () => {
		expect(embeddingConfigFor("openai")?.model).toBe("text-embedding-3-small");
		expect(embeddingConfigFor("openrouter")?.model).toBe("text-embedding-3-small");
		expect(embeddingConfigFor("groq")?.model).toBe("text-embedding-3-small");
	});

	it("embeds Gemini via its OpenAI-compatible surface with a Bearer key", () => {
		const config = embeddingConfigFor("gemini");
		expect(config?.model).toBe("text-embedding-004");
		const request = config?.buildRequest({
			url: "https://generativelanguage.googleapis.com",
			apiKey: "k",
			text: "hi",
		});
		expect(request?.url).toBe("https://generativelanguage.googleapis.com/v1beta/openai/embeddings");
		expect(request?.headers.Authorization).toBe("Bearer k");
	});

	it("returns null for providers with no embeddings endpoint", () => {
		expect(embeddingConfigFor("anthropic")).toBeNull();
		expect(embeddingConfigFor(undefined)).toBeNull();
	});
});

describe("embed", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2] }] }), {
					headers: { "Content-Type": "application/json" },
				}),
			),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("skips an endpoint whose key can't be decrypted and uses the next one", async () => {
		findMany.mockResolvedValue([
			{ id: "e1", url: "https://one.test", provider: "openai", apiKeyEncrypted: "corrupt" },
			{ id: "e2", url: "https://two.test", provider: "openai", apiKeyEncrypted: "good" },
		]);
		decrypt.mockImplementation((ciphertext: string) => {
			if (ciphertext === "corrupt") throw new Error("bad auth tag");
			return "plain-key";
		});

		await expect(embed({ text: "hello", ownerId: "u1" })).resolves.toEqual([0.1, 0.2]);

		const fetchMock = vi.mocked(fetch);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(fetchMock.mock.calls[0]?.[0]).toBe("https://two.test/v1/embeddings");
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
