import { describe, expect, it } from "vitest";
import { asLLMProvider, buildModelsRequest, detectProvider } from "#/shared/lib/llm.server";

describe("llm.server", () => {
	describe("asLLMProvider", () => {
		it("narrows a recognized provider string", () => {
			expect(asLLMProvider("ollama")).toBe("ollama");
			expect(asLLMProvider("anthropic")).toBe("anthropic");
		});

		it("returns undefined for an unrecognized value", () => {
			expect(asLLMProvider("bogus")).toBeUndefined();
			expect(asLLMProvider("")).toBeUndefined();
		});
	});

	describe("buildModelsRequest", () => {
		it("does not double a /v1 suffix already present on the endpoint URL", () => {
			expect(buildModelsRequest({ url: "https://api.openai.com/v1", provider: "openai" }).url).toBe(
				"https://api.openai.com/v1/models",
			);
			expect(
				buildModelsRequest({ url: "https://api.anthropic.com/v1", provider: "anthropic" }).url,
			).toBe("https://api.anthropic.com/v1/models");
		});

		it("still appends /v1/models when the URL has no version suffix", () => {
			expect(buildModelsRequest({ url: "http://localhost:1234", provider: "openai" }).url).toBe(
				"http://localhost:1234/v1/models",
			);
		});
	});

	describe("detectProvider", () => {
		it("should detect Anthropic from api.anthropic.com", () => {
			expect(detectProvider("https://api.anthropic.com/v1")).toBe("anthropic");
		});

		it("should detect Ollama from localhost:11434", () => {
			expect(detectProvider("http://localhost:11434")).toBe("ollama");
		});

		it("should detect Groq from api.groq.com", () => {
			expect(detectProvider("https://api.groq.com/openai/v1")).toBe("groq");
		});

		it("should detect OpenRouter from openrouter.ai", () => {
			expect(detectProvider("https://openrouter.ai/api/v1")).toBe("openrouter");
		});

		it("should default to OpenAI for unknown URLs", () => {
			expect(detectProvider("https://api.openai.com/v1")).toBe("openai");
			expect(detectProvider("https://my-custom-proxy.example.com/v1")).toBe("openai");
		});
	});
});
