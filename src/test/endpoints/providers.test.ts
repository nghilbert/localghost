import { describe, expect, it } from "vitest";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	PROVIDERS,
} from "#/features/endpoints/lib/providers";
import { detectProvider } from "#/lib/llm.server";

describe("provider registry", () => {
	it("default base urls round-trip through detectProvider", () => {
		for (const provider of PROVIDERS) {
			if (!provider.defaultBaseUrl) continue;
			expect(detectProvider(provider.defaultBaseUrl)).toBe(dbProviderFor(provider.id));
		}
	});

	it("maps custom onto the openai db provider", () => {
		expect(dbProviderFor("custom")).toBe("openai");
		expect(dbProviderFor("anthropic")).toBe("anthropic");
		expect(dbProviderFor("ollama")).toBe("ollama");
	});

	it("cloud providers require an api key and provide key guidance", () => {
		for (const provider of PROVIDERS) {
			if (provider.defaultBaseUrl) {
				expect(provider.requiresApiKey).toBe(true);
				expect(provider.keyConsoleUrl).toBeDefined();
			}
		}
	});

	it("ollama prefills a local url without requiring a key", () => {
		const ollama = PROVIDERS.find((p) => p.id === "ollama");
		expect(ollama?.defaultBaseUrl).toBeNull();
		expect(ollama?.requiresApiKey).toBe(false);
		expect(ollama?.prefillBaseUrl).toBe("http://localhost:11434");
		expect(detectProvider("http://localhost:11434")).toBe("ollama");
	});

	it("lists ollama first as the default provider", () => {
		expect(PROVIDERS[0]?.id).toBe("ollama");
	});

	it("routes gemini through detectProvider and maps to its own db provider", () => {
		expect(detectProvider("https://generativelanguage.googleapis.com")).toBe("gemini");
		expect(dbProviderFor("gemini")).toBe("gemini");
	});
});

describe("buildEndpointFormSchema", () => {
	const cloud = PROVIDERS.find((p) => p.id === "anthropic");
	const custom = PROVIDERS.find((p) => p.id === "custom");
	if (!cloud || !custom) throw new Error("registry is missing expected providers");

	it("requires an api key for cloud providers", () => {
		const schema = buildEndpointFormSchema(cloud);
		expect(
			schema.safeParse({ name: "A", url: "https://api.anthropic.com", apiKey: "" }).success,
		).toBe(false);
		expect(
			schema.safeParse({ name: "A", url: "https://api.anthropic.com", apiKey: "sk-ant-x" }).success,
		).toBe(true);
	});

	it("does not require an api key for custom providers", () => {
		const schema = buildEndpointFormSchema(custom);
		expect(
			schema.safeParse({ name: "vLLM", url: "http://my-server:8000/v1", apiKey: "" }).success,
		).toBe(true);
	});

	it("rejects invalid urls", () => {
		const schema = buildEndpointFormSchema(custom);
		expect(schema.safeParse({ name: "x", url: "not-a-url", apiKey: "" }).success).toBe(false);
	});
});
