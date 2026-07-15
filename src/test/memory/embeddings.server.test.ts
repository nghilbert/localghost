import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { decrypt, findMany } = vi.hoisted(() => ({ decrypt: vi.fn(), findMany: vi.fn() }));

vi.mock("#/shared/lib/crypto.server", () => ({ decrypt, encrypt: vi.fn() }));
vi.mock("#/shared/lib/db.server", () => ({ prisma: { endpoint: { findMany } } }));

import {
	embed,
	embeddingModelFor,
	toVectorLiteral,
} from "#/shared/domain/memory/embeddings.server";

describe("embeddingModelFor", () => {
	it("picks a local embedding model for ollama, not the chat model", () => {
		expect(embeddingModelFor("ollama")).toBe("nomic-embed-text");
	});

	it("picks an OpenAI-compatible embedding model for openai/openrouter/groq", () => {
		expect(embeddingModelFor("openai")).toBe("text-embedding-3-small");
		expect(embeddingModelFor("openrouter")).toBe("text-embedding-3-small");
		expect(embeddingModelFor("groq")).toBe("text-embedding-3-small");
	});

	it("returns null for providers with no OpenAI-compatible embeddings endpoint", () => {
		expect(embeddingModelFor("anthropic")).toBeNull();
		expect(embeddingModelFor("gemini")).toBeNull();
		expect(embeddingModelFor(undefined)).toBeNull();
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
