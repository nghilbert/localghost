import type { AnyTextAdapter, ModelMessage, ServerTool, StreamChunk } from "@tanstack/ai";
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
	/** Validated per-endpoint native sampling options (Ollama). Each present field overrides the default. */
	options?: Record<string, unknown>;
};

const OPENROUTER_REFERER = "https://localghost.app";
const DEFAULT_MAX_TOKENS = 4096;
const MAX_AGENT_ROUNDS = 10;

/** Shape of the model-list responses across providers (OpenAI `data`, Ollama/Gemini `models`). */
type ModelsResponse = {
	data?: Array<{ id: string }>;
	models?: Array<{ name: string }>;
};

/**
 * Per-provider configuration that drives every provider-specific decision:
 * adapter construction, base-URL normalization, the `modelOptions` request
 * shape, and the model-list endpoint's URL/headers/parsing. Keyed by
 * {@link LLMProvider} in {@link PROVIDERS} so the rest of the file stays
 * branch-free.
 */
type ProviderConfig = {
	/** Normalizes a configured endpoint URL to the base the chat adapter expects. */
	chatBaseUrl: (url: string) => string;
	/** Builds the `@tanstack/ai` text adapter for a model against the normalized base URL. */
	buildAdapter: (args: { model: string; apiKey: string; baseUrl: string }) => AnyTextAdapter;
	/**
	 * The provider-specific `modelOptions` payload for a `chat()` call. `options` carries the
	 * validated per-endpoint native sampling settings; providers that support them spread them
	 * over the defaults so a present field wins, and the rest ignore the blob.
	 */
	modelOptions: (args: {
		model: string;
		temperature: number;
		maxTokens: number;
		options: Record<string, unknown>;
	}) => Record<string, unknown>;
	/** Headers for the model-list fetch (auth lives here for header-auth providers). */
	modelsHeaders: (apiKey?: string) => Record<string, string>;
	/** The model-list endpoint URL, given a trailing-slash-stripped base. */
	modelsUrl: (args: { base: string; apiKey?: string }) => string;
	/** Extracts the advertised model ids from a model-list response. */
	parseModels: (json: ModelsResponse) => string[];
};

/** Clamps a temperature into Anthropic's accepted `[0, 1]` range. */
function clampUnit(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

/** Builds an OpenAI-compatible adapter, optionally with extra default headers. */
function openaiAdapter({
	model,
	apiKey,
	baseUrl,
	defaultHeaders,
}: {
	model: string;
	apiKey: string;
	baseUrl: string;
	defaultHeaders?: Record<string, string>;
}): AnyTextAdapter {
	return openaiCompatibleText(model, {
		baseURL: baseUrl,
		apiKey,
		api: "chat-completions",
		...(defaultHeaders ? { defaultHeaders } : {}),
	});
}

const OPENAI_COMPATIBLE: ProviderConfig = {
	// Normalize to end at `/v1`; the SDK appends `/chat/completions`.
	chatBaseUrl: (url) => {
		const base = url.replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
		return base.endsWith("/v1") ? base : `${base}/v1`;
	},
	buildAdapter: (args) => openaiAdapter(args),
	modelOptions: ({ temperature, maxTokens }) => ({
		temperature,
		max_tokens: maxTokens,
	}),
	modelsHeaders: (apiKey) => ({
		"Content-Type": "application/json",
		...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
	}),
	modelsUrl: ({ base }) => `${base}/v1/models`,
	parseModels: (json) => (json.data ?? []).map((m) => m.id),
};

const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
	anthropic: {
		// Strip a trailing slash and a redundant `/v1` so the SDK appends its own path.
		chatBaseUrl: (url) => url.replace(/\/+$/, "").replace(/\/v1$/, ""),
		buildAdapter: ({ model, apiKey, baseUrl }) => {
			// `createAnthropicChat` type-constrains the model to a fixed list; widen it with a
			// runtime model definition so any bring-your-own Claude model name is accepted.
			const factory = extendAdapter(createAnthropicChat, [
				createModel(model, ["text", "image", "document"]),
			]);
			return factory(model, apiKey, { baseURL: baseUrl });
		},
		modelOptions: ({ temperature, maxTokens }) => ({
			temperature: clampUnit(temperature),
			max_tokens: maxTokens,
		}),
		modelsHeaders: (apiKey) => ({
			"Content-Type": "application/json",
			"anthropic-version": "2023-06-01",
			...(apiKey ? { "x-api-key": apiKey } : {}),
		}),
		modelsUrl: ({ base }) => `${base}/v1/models`,
		parseModels: (json) => (json.data ?? []).map((m) => m.id),
	},
	gemini: {
		chatBaseUrl: (url) => url.replace(/\/+$/, ""),
		buildAdapter: ({ model, apiKey, baseUrl }) => {
			// `createGeminiChat` type-constrains the model to a fixed list; widen it with a
			// runtime model definition so any bring-your-own Gemini model name is accepted.
			const factory = extendAdapter(createGeminiChat, [
				createModel(model, ["text", "image", "document"]),
			]);
			return factory(model, apiKey, { httpOptions: { baseUrl } });
		},
		modelOptions: ({ temperature, maxTokens }) => ({
			temperature,
			maxOutputTokens: maxTokens,
		}),
		// Gemini authenticates via a `?key=` query parameter, not an Authorization header.
		modelsHeaders: () => ({ "Content-Type": "application/json" }),
		modelsUrl: ({ base, apiKey }) => `${base}/v1beta/models?key=${apiKey ?? ""}`,
		parseModels: (json) => (json.models ?? []).map((m) => m.name.replace(/^models\//, "")),
	},
	ollama: {
		// Reduce to the host root; the SDK appends `/api/chat`.
		chatBaseUrl: (url) => url.replace(/\/+$/, "").replace(/\/api$/, ""),
		buildAdapter: ({ model, baseUrl }) => createOllamaChat(model, baseUrl),
		modelOptions: ({ model, temperature, maxTokens, options }) => ({
			model,
			options: { temperature, num_predict: maxTokens, ...options },
		}),
		modelsHeaders: () => ({ "Content-Type": "application/json" }),
		modelsUrl: ({ base }) => `${base}/api/tags`,
		parseModels: (json) => (json.models ?? []).map((m) => m.name),
	},
	openrouter: {
		...OPENAI_COMPATIBLE,
		buildAdapter: ({ model, apiKey, baseUrl }) =>
			openaiAdapter({
				model,
				apiKey,
				baseUrl,
				defaultHeaders: { "HTTP-Referer": OPENROUTER_REFERER },
			}),
	},
	groq: OPENAI_COMPATIBLE,
	openai: OPENAI_COMPATIBLE,
};

/**
 * Auto-detects the provider family from a bring-your-own endpoint URL so the
 * right {@link ProviderConfig} is selected.
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

/**
 * Drives a `chat()` run against the detected provider, applying the registry's
 * adapter construction, base-URL normalization, and `modelOptions` shape.
 * Returns the raw `@tanstack/ai` (AG-UI) event stream — `chat()` auto-executes
 * any server tools and loops up to `MAX_AGENT_ROUNDS`.
 */
function chatEvents(
	opts: StreamLLMOptions,
	tools: ServerTool[] | undefined,
): AsyncIterable<StreamChunk> {
	const config = PROVIDERS[detectProvider(opts.url)];
	const temperature = opts.temperature ?? 0.7;
	const maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
	const adapter = config.buildAdapter({
		model: opts.model,
		apiKey: opts.apiKey ?? "",
		baseUrl: config.chatBaseUrl(opts.url),
	});
	return chat({
		adapter,
		messages: opts.messages,
		systemPrompts: opts.systemPrompt ? [opts.systemPrompt] : [],
		stream: true as const,
		modelOptions: config.modelOptions({
			model: opts.model,
			temperature,
			maxTokens,
			options: opts.options ?? {},
		}),
		...(tools ? { tools, agentLoopStrategy: maxIterations(MAX_AGENT_ROUNDS) } : {}),
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

/**
 * Probes a provider's model-list endpoint with real auth so failures are
 * distinguishable — unlike {@link listModels}, which collapses errors into `[]`.
 *
 * @param url - The endpoint base URL.
 * @param apiKey - Optional API key for authenticated providers.
 * @returns Whether the endpoint responded, its status, and a model count when available.
 */
export async function probeEndpoint({
	url,
	apiKey,
}: {
	url: string;
	apiKey?: string;
}): Promise<EndpointProbeResult> {
	const config = PROVIDERS[detectProvider(url)];
	const base = url.replace(/\/+$/, "");
	try {
		const res = await fetch(config.modelsUrl({ base, apiKey }), {
			headers: config.modelsHeaders(apiKey),
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) {
			const reason = res.status === 401 || res.status === 403 ? "API key rejected" : res.statusText;
			return { ok: false, status: res.status, error: `${reason} (HTTP ${res.status})` };
		}
		const data: ModelsResponse = await res.json();
		return { ok: true, status: res.status, modelCount: config.parseModels(data).length };
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
export async function listModels({
	url,
	apiKey,
}: {
	url: string;
	apiKey?: string;
}): Promise<string[]> {
	const config = PROVIDERS[detectProvider(url)];
	const base = url.replace(/\/+$/, "");
	try {
		const res = await fetch(config.modelsUrl({ base, apiKey }), {
			headers: config.modelsHeaders(apiKey),
		});
		if (!res.ok) return [];
		const data: ModelsResponse = await res.json();
		return config.parseModels(data);
	} catch {
		return [];
	}
}
