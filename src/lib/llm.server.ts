import type { ModelMessage, ServerTool, StreamChunk } from "@tanstack/ai";
import { chat, createModel, extendAdapter, maxIterations } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createOllamaChat } from "@tanstack/ai-ollama";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";

export type LLMProvider = "anthropic" | "ollama" | "openai" | "openrouter" | "groq" | "gemini";

export type StreamLLMOptions = {
	url: string;
	apiKey?: string;
	model: string;
	/** Conversation history as framework `ModelMessage`s (roles user/assistant/tool — no system). */
	messages: ModelMessage[];
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
};

const OPENROUTER_REFERER = "https://pretty-odysseus.app";
const DEFAULT_MAX_TOKENS = 4096;
const MAX_AGENT_ROUNDS = 10;

/**
 * Auto-detects the provider family from a bring-your-own endpoint URL so the
 * right `@tanstack/ai` adapter and request shape are selected.
 *
 * @param url - The endpoint base URL configured on a `ModelEndpoint`.
 * @returns The detected provider family.
 */
export function detectProvider(url: string): LLMProvider {
	const u = url.toLowerCase();
	if (u.includes("anthropic.com")) return "anthropic";
	if (u.includes("generativelanguage.googleapis.com")) return "gemini";
	if (u.includes(":11434") || u.includes("ollama.com")) return "ollama";
	if (u.includes("openrouter.ai")) return "openrouter";
	if (u.includes("groq.com")) return "groq";
	return "openai";
}

/** Strips a trailing slash and a redundant `/v1` so the Anthropic SDK can append its own path. */
function anthropicBaseUrl(url: string): string {
	return url.replace(/\/+$/, "").replace(/\/v1$/, "");
}

/** Normalizes an OpenAI-compatible base URL to end at `/v1` (the SDK appends `/chat/completions`). */
function openaiBaseUrl(url: string): string {
	const base = url.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
	return base.endsWith("/v1") ? base : `${base}/v1`;
}

/** Reduces an Ollama URL to its host root (the SDK appends `/api/chat`). */
function ollamaHost(url: string): string {
	return url.replace(/\/+$/, "").replace(/\/api$/, "");
}

/** Strips a trailing slash so the Gemini SDK can append its own versioned path. */
function geminiBaseUrl(url: string): string {
	return url.replace(/\/+$/, "");
}

/** Clamps a temperature into Anthropic's accepted `[0, 1]` range. */
function clampUnit(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

/**
 * Drives a `chat()` run against the detected provider, applying per-provider
 * adapter construction, base-URL normalization, header quirks, and the
 * provider-specific `modelOptions` shape. Returns the raw `@tanstack/ai`
 * (AG-UI) event stream — `chat()` auto-executes any server tools and loops up
 * to `maxIterations`.
 */
function chatEvents(
	opts: StreamLLMOptions,
	tools: ServerTool[] | undefined,
): AsyncIterable<StreamChunk> {
	const provider = detectProvider(opts.url);
	const systemPrompts = opts.systemPrompt ? [opts.systemPrompt] : [];
	const modelMessages = opts.messages;
	const temperature = opts.temperature ?? 0.7;
	const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
	const shared = {
		messages: modelMessages,
		systemPrompts,
		stream: true as const,
		...(tools ? { tools, agentLoopStrategy: maxIterations(MAX_AGENT_ROUNDS) } : {}),
	};

	if (provider === "anthropic") {
		// `createAnthropicChat` type-constrains the model to a fixed list; widen it with a
		// runtime model definition so any bring-your-own Claude model name is accepted.
		const factory = extendAdapter(createAnthropicChat, [
			createModel(opts.model, ["text", "image", "document"]),
		]);
		const adapter = factory(opts.model, opts.apiKey ?? "", {
			baseURL: anthropicBaseUrl(opts.url),
		});
		return chat({
			adapter,
			...shared,
			modelOptions: { temperature: clampUnit(temperature), max_tokens: maxTokens },
		});
	}

	if (provider === "ollama") {
		const adapter = createOllamaChat(opts.model, ollamaHost(opts.url));
		return chat({
			adapter,
			...shared,
			modelOptions: { model: opts.model, options: { temperature, num_predict: maxTokens } },
		});
	}

	if (provider === "gemini") {
		// `createGeminiChat` type-constrains the model to a fixed list; widen it with a
		// runtime model definition so any bring-your-own Gemini model name is accepted.
		const factory = extendAdapter(createGeminiChat, [
			createModel(opts.model, ["text", "image", "document"]),
		]);
		const adapter = factory(opts.model, opts.apiKey ?? "", {
			httpOptions: { baseUrl: geminiBaseUrl(opts.url) },
		});
		return chat({
			adapter,
			...shared,
			modelOptions: { temperature, maxOutputTokens: maxTokens },
		});
	}

	const adapter = openaiCompatibleText(opts.model, {
		baseURL: openaiBaseUrl(opts.url),
		apiKey: opts.apiKey ?? "",
		api: "chat-completions",
		...(provider === "openrouter"
			? { defaultHeaders: { "HTTP-Referer": OPENROUTER_REFERER } }
			: {}),
	});
	return chat({
		adapter,
		...shared,
		modelOptions: { temperature, max_tokens: maxTokens },
	});
}

/**
 * Streams a completion as the raw `@tanstack/ai` (AG-UI) event stream that the
 * `@tanstack/ai-client` SSE adapter consumes natively. Unlike a downconverted
 * stream, text/reasoning deltas, usage, and run lifecycle events pass through verbatim.
 *
 * @param opts - Endpoint, model, messages, system prompt, and sampling controls.
 * @param tools - Optional `ServerTool[]` for agent mode; when provided the loop runs up to `MAX_AGENT_ROUNDS`.
 * @returns The `@tanstack/ai` event stream for this completion.
 */
export function streamLLMEvents(
	opts: StreamLLMOptions,
	tools?: ServerTool[],
): AsyncIterable<StreamChunk> {
	return chatEvents(opts, tools);
}

/**
 * Non-streaming convenience wrapper: iterates `chatEvents` and collects
 * `TEXT_MESSAGE_CONTENT` deltas into the full assistant response text.
 *
 * @param opts - Same options as {@link streamLLMEvents}.
 * @returns The full assistant response text.
 */
export async function callLLM(opts: StreamLLMOptions): Promise<string> {
	let text = "";
	for await (const chunk of chatEvents(opts, undefined)) {
		if (chunk.type === "TEXT_MESSAGE_CONTENT") text += chunk.delta;
	}
	return text;
}

export type EndpointProbeResult = {
	ok: boolean;
	status?: number;
	modelCount?: number;
	error?: string;
};

function modelsHeaders(provider: LLMProvider, apiKey?: string): Record<string, string> {
	const headers: Record<string, string> = { "Content-Type": "application/json" };
	if (provider === "anthropic") {
		if (apiKey) headers["x-api-key"] = apiKey;
		headers["anthropic-version"] = "2023-06-01";
	} else if (provider !== "gemini" && apiKey) {
		// Gemini authenticates via a `?key=` query parameter, not an Authorization header.
		headers.Authorization = `Bearer ${apiKey}`;
	}
	return headers;
}

/**
 * Probes a provider's model-list endpoint with real auth so failures are
 * distinguishable — unlike {@link listModels}, which collapses errors into `[]`.
 *
 * @param url - The endpoint base URL.
 * @param apiKey - Optional API key for authenticated providers.
 * @returns Whether the endpoint responded, its status, and a model count when available.
 */
export async function probeEndpoint(url: string, apiKey?: string): Promise<EndpointProbeResult> {
	const provider = detectProvider(url);
	const base = url.replace(/\/$/, "");
	const modelsUrl =
		provider === "ollama"
			? `${base}/api/tags`
			: provider === "gemini"
				? `${base}/v1beta/models?key=${apiKey ?? ""}`
				: `${base}/v1/models`;
	try {
		const res = await fetch(modelsUrl, {
			headers: modelsHeaders(provider, apiKey),
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			const reason = res.status === 401 || res.status === 403 ? "API key rejected" : res.statusText;
			return { ok: false, status: res.status, error: `${reason} (HTTP ${res.status})` };
		}
		const data = (await res.json()) as { data?: unknown[]; models?: unknown[] };
		return { ok: true, status: res.status, modelCount: (data.data ?? data.models ?? []).length };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
	}
}

/**
 * Lists the model ids advertised by an endpoint, collapsing any error to `[]`.
 *
 * @param url - The endpoint base URL.
 * @param apiKey - Optional API key for authenticated providers.
 * @returns The available model ids, or `[]` on any failure.
 */
export async function listModels(url: string, apiKey?: string): Promise<string[]> {
	const provider = detectProvider(url);
	const base = url.replace(/\/$/, "");
	try {
		if (provider === "ollama") {
			const res = await fetch(`${base}/api/tags`, { headers: modelsHeaders(provider, apiKey) });
			if (!res.ok) return [];
			const data = (await res.json()) as { models?: { name: string }[] };
			return (data.models ?? []).map((m) => m.name);
		}
		if (provider === "gemini") {
			const res = await fetch(`${base}/v1beta/models?key=${apiKey ?? ""}`, {
				headers: modelsHeaders(provider, apiKey),
			});
			if (!res.ok) return [];
			const data = (await res.json()) as { models?: { name: string }[] };
			return (data.models ?? []).map((m) => m.name.replace(/^models\//, ""));
		}
		const res = await fetch(`${base}/v1/models`, { headers: modelsHeaders(provider, apiKey) });
		if (!res.ok) return [];
		const data = (await res.json()) as { data?: { id: string }[] };
		return (data.data ?? []).map((m) => m.id);
	} catch {
		return [];
	}
}
