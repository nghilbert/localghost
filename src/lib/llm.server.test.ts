import { describe, expect, it } from "vitest";
import { detectProvider } from "#/lib/llm.server";

describe("llm.server", () => {
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
