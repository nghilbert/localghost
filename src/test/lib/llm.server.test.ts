import { afterEach, describe, expect, it, vi } from "vitest";
import {
	asLLMProvider,
	buildModelsRequest,
	chatBaseUrl,
	detectProvider,
	modelSupportsTools,
} from "#/shared/lib/llm.server";

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

	describe("buildModelsRequest: per-provider auth headers", () => {
		it("sends anthropic auth via x-api-key plus the anthropic-version header", () => {
			const { headers } = buildModelsRequest({
				url: "https://api.anthropic.com/v1",
				provider: "anthropic",
				apiKey: "sk-ant",
			});
			expect(headers["x-api-key"]).toBe("sk-ant");
			expect(headers["anthropic-version"]).toBe("2023-06-01");
			expect(headers.Authorization).toBeUndefined();
		});

		it("sends openai-compatible auth via a bearer token", () => {
			const { headers } = buildModelsRequest({
				url: "https://api.openai.com/v1",
				provider: "openai",
				apiKey: "sk-oai",
			});
			expect(headers.Authorization).toBe("Bearer sk-oai");
		});

		it("omits auth headers for gemini, authenticating via the URL instead", () => {
			const { url, headers } = buildModelsRequest({
				url: "https://generativelanguage.googleapis.com",
				provider: "gemini",
				apiKey: "gm-key",
			});
			expect(headers.Authorization).toBeUndefined();
			expect(headers["x-api-key"]).toBeUndefined();
			expect(url).toContain("key=gm-key");
		});

		it("sends no auth header for ollama", () => {
			const { headers } = buildModelsRequest({ url: "http://localhost:11434", provider: "ollama" });
			expect(headers.Authorization).toBeUndefined();
			expect(Object.keys(headers)).toEqual(["Content-Type"]);
		});

		it("prefers an explicit provider over URL sniffing on a custom domain", () => {
			// An anthropic-compatible proxy: sniffing would land on openai and send
			// a bearer token; the stored provider must win.
			const { url, headers } = buildModelsRequest({
				url: "https://claude-proxy.example.com",
				provider: "anthropic",
				apiKey: "sk-ant",
			});
			expect(url).toBe("https://claude-proxy.example.com/v1/models");
			expect(headers["x-api-key"]).toBe("sk-ant");
			expect(headers.Authorization).toBeUndefined();
		});
	});

	describe("chatBaseUrl", () => {
		it("dedupes a /v1 suffix and strips a trailing /chat/completions for openai-compatible providers", () => {
			expect(chatBaseUrl({ url: "https://api.openai.com/v1", provider: "openai" })).toBe(
				"https://api.openai.com/v1",
			);
			expect(
				chatBaseUrl({ url: "https://api.groq.com/openai/v1/chat/completions", provider: "groq" }),
			).toBe("https://api.groq.com/openai/v1");
			expect(chatBaseUrl({ url: "https://my-proxy.example.com", provider: "openai" })).toBe(
				"https://my-proxy.example.com/v1",
			);
		});

		it("strips a trailing /v1 for anthropic", () => {
			expect(chatBaseUrl({ url: "https://api.anthropic.com/v1", provider: "anthropic" })).toBe(
				"https://api.anthropic.com",
			);
		});

		it("strips a trailing /api for ollama", () => {
			expect(chatBaseUrl({ url: "http://localhost:11434/api", provider: "ollama" })).toBe(
				"http://localhost:11434",
			);
		});

		it("leaves the gemini base URL untouched", () => {
			expect(
				chatBaseUrl({ url: "https://generativelanguage.googleapis.com", provider: "gemini" }),
			).toBe("https://generativelanguage.googleapis.com");
		});
	});

	describe("modelSupportsTools", () => {
		afterEach(() => {
			vi.unstubAllGlobals();
		});

		function stubModels(data: Array<{ id: string; supported_parameters?: string[] }>) {
			// A fresh Response per call: a body is single-read.
			vi.stubGlobal(
				"fetch",
				vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ data })))),
			);
		}

		it("reads openrouter tool support from supported_parameters", async () => {
			stubModels([
				{ id: "meta/tool-model", supported_parameters: ["tools", "temperature"] },
				{ id: "meta/plain-model", supported_parameters: ["temperature"] },
			]);
			const url = "https://openrouter.ai/api";
			await expect(
				modelSupportsTools({ url, provider: "openrouter", model: "meta/tool-model" }),
			).resolves.toBe(true);
			await expect(
				modelSupportsTools({ url, provider: "openrouter", model: "meta/plain-model" }),
			).resolves.toBe(false);
		});

		it("assumes capable when the model is missing from the list", async () => {
			stubModels([]);
			await expect(
				modelSupportsTools({
					url: "https://openrouter.ai/api",
					provider: "openrouter",
					model: "unlisted",
				}),
			).resolves.toBe(true);
		});

		it("assumes capable without fetching for providers with no capability metadata", async () => {
			const fetchSpy = vi.fn();
			vi.stubGlobal("fetch", fetchSpy);
			await expect(
				modelSupportsTools({ url: "https://api.openai.com", provider: "openai", model: "gpt-x" }),
			).resolves.toBe(true);
			expect(fetchSpy).not.toHaveBeenCalled();
		});

		it("assumes capable when the model-list fetch fails", async () => {
			vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
			await expect(
				modelSupportsTools({
					url: "https://openrouter.ai/api",
					provider: "openrouter",
					model: "meta/tool-model",
				}),
			).resolves.toBe(true);
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
