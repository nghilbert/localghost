import { describe, expect, it } from "vitest";
import { embeddingModelFor, toVectorLiteral } from "#/entities/memory/embeddings.server";

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
