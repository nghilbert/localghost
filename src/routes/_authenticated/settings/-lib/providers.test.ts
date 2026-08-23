import { describe, expect, it } from "vitest";
import {
	buildEndpointFormSchema,
	dbProviderFor,
	PROVIDERS,
	providerDefinitionFor,
} from "#/routes/_authenticated/settings/-lib/providers";
import { detectProvider } from "#/shared/lib/llm/provider";

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
		expect(dbProviderFor("llamacpp")).toBe("llamacpp");
	});

	it("cloud providers require an api key and provide key guidance", () => {
		for (const provider of PROVIDERS) {
			if (provider.defaultBaseUrl) {
				expect(provider.requiresApiKey).toBe(true);
				expect(provider.keyConsoleUrl).toBeDefined();
			}
		}
	});

	it("omits llamacpp from the add-endpoint picker (it is the built-in endpoint)", () => {
		expect(PROVIDERS.some((p) => p.id === "llamacpp")).toBe(false);
	});

	it("does not hijack a bare :8080 URL as llamacpp (too common a port to sniff)", () => {
		expect(detectProvider("http://localhost:8080")).toBe("openai");
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
		const schema = buildEndpointFormSchema({ definition: cloud });
		expect(
			schema.safeParse({ name: "A", url: "https://api.anthropic.com", apiKey: "" }).success,
		).toBe(false);
		expect(
			schema.safeParse({ name: "A", url: "https://api.anthropic.com", apiKey: "sk-ant-x" }).success,
		).toBe(true);
	});

	it("does not require an api key for custom providers", () => {
		const schema = buildEndpointFormSchema({ definition: custom });
		expect(
			schema.safeParse({ name: "vLLM", url: "http://my-server:8000/v1", apiKey: "" }).success,
		).toBe(true);
	});

	it("treats a blank key as valid when requireApiKey is off (edit keeps the current key)", () => {
		const schema = buildEndpointFormSchema({ definition: cloud, requireApiKey: false });
		expect(
			schema.safeParse({ name: "A", url: "https://api.anthropic.com", apiKey: "" }).success,
		).toBe(true);
	});

	it("rejects invalid urls", () => {
		const schema = buildEndpointFormSchema({ definition: custom });
		expect(schema.safeParse({ name: "x", url: "not-a-url", apiKey: "" }).success).toBe(false);
	});
});

describe("providerDefinitionFor", () => {
	it("maps a stored db provider back to its picker definition", () => {
		expect(providerDefinitionFor("anthropic").id).toBe("anthropic");
		expect(providerDefinitionFor("gemini").id).toBe("gemini");
	});

	it("prefers the OpenAI definition for stored provider openai (not the custom fallback)", () => {
		// `openai` and `custom` both persist as provider "openai"; the concrete match wins.
		expect(providerDefinitionFor("openai").id).toBe("openai");
	});

	it("falls back to custom when no picker definition maps to the provider (e.g. llamacpp)", () => {
		expect(providerDefinitionFor("llamacpp").id).toBe("custom");
	});
});
