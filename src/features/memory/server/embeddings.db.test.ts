import { http, HttpResponse } from "msw";
import { describe, expect } from "vitest";
import { encrypt } from "#/lib/crypto.server";
import { createEndpoint, createUser, it } from "#/test/db.server";
import { embeddingsApi } from "#/test/embeddings-api";
import { network } from "#/test/network.server";
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
	it("skips an endpoint whose key can't be decrypted and uses the next one", async () => {
		const user = await createUser();
		// Not a valid `iv:tag:ciphertext` triple, so the key can't be decrypted.
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
		// Only the second endpoint answers, so a request to the first fails the test.
		network.use(embeddingsApi({ base: "https://two.test/v1", vectorFor: () => [0.1, 0.2] }));

		await expect(embed({ text: "hello", ownerId: user.id })).resolves.toEqual([0.1, 0.2]);
	});

	it("falls through to the next endpoint when one fails", async () => {
		const user = await createUser();
		for (const url of ["https://one.test", "https://two.test"]) {
			await createEndpoint({
				ownerId: user.id,
				url,
				provider: "openai",
				apiKeyEncrypted: encrypt("key"),
			});
		}
		network.use(
			http.post("https://one.test/v1/embeddings", () => new HttpResponse(null, { status: 500 })),
			embeddingsApi({ base: "https://two.test/v1", vectorFor: () => [0.3, 0.4] }),
		);

		await expect(embed({ text: "hello", ownerId: user.id })).resolves.toEqual([0.3, 0.4]);
	});

	it("returns null when no endpoint can embed", async () => {
		const user = await createUser();
		await createEndpoint({ ownerId: user.id, url: "https://claude.test", provider: "anthropic" });

		await expect(embed({ text: "hello", ownerId: user.id })).resolves.toBeNull();
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
		expect(JSON.parse(literal)).toEqual(v);
	});
});
