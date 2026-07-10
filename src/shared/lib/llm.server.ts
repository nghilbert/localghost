import type {
	AnyTextAdapter,
	ModelMessage,
	ServerTool,
	StreamChunk,
	UIMessage,
} from "@tanstack/ai";
import { chat, createModel, extendAdapter, maxIterations } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { createOllamaChat } from "@tanstack/ai-ollama";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { trimPathRight } from "@tanstack/react-router";
import { z } from "zod/v4";

export type LLMProvider = "anthropic" | "ollama" | "openai" | "openrouter" | "groq" | "gemini";

const llmProviderSchema = z.enum(["anthropic", "ollama", "openai", "openrouter", "groq", "gemini"]);

/** Narrows a stored `Endpoint.provider` string to {@link LLMProvider}, or `undefined` if unrecognized. */
export function asLLMProvider(value: string): LLMProvider | undefined {
	const parsed = llmProviderSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

export type StreamLLMOptions = {
	url: string;
	/** The endpoint's stored provider; falls back to URL sniffing only when absent. */
	provider?: LLMProvider;
	apiKey?: string;
	model: string;
	/** Conversation history as wire messages; `chat()` converts internally (no system role). */
	messages: Array<UIMessage | ModelMessage>;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	/** Validated per-endpoint native sampling options (Ollama). Each present field overrides the default. */
	options?: Record<string, unknown>;
	/** AG-UI thread id from the wire, forwarded so run events stay correlated. */
	threadId?: string;
	/** AG-UI run id from the wire. */
	runId?: string;
	/** Server tools to auto-execute; when present the agent loop runs. */
	tools?: ServerTool[];
};

const OPENROUTER_REFERER = "https://localghost.app";
const DEFAULT_MAX_TOKENS = 4096;
const MAX_AGENT_ROUNDS = 10;
// Ollama's own default is 4096, which silently truncates long chats (the
// system prompt shifts out first). A per-endpoint num_ctx overrides this.
const DEFAULT_OLLAMA_NUM_CTX = 8192;

/** Shape of the model-list responses across providers (OpenAI `data`, Ollama/Gemini `models`). */
type ModelsResponse = {
	data?: Array<{ id: string }>;
	models?: Array<{ name: string }>;
};

/**
 * Per-provider configuration driving every provider-specific decision: adapter
 * construction, base-URL normalization, `modelOptions` shape, and the model-list
 * endpoint. Keyed by {@link LLMProvider} so the rest of the file stays branch-free.
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
		const base = trimPathRight(url).replace(/\/chat\/completions$/, "");
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
		chatBaseUrl: (url) => trimPathRight(url).replace(/\/v1$/, ""),
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
		chatBaseUrl: (url) => trimPathRight(url),
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
		chatBaseUrl: (url) => trimPathRight(url).replace(/\/api$/, ""),
		buildAdapter: ({ model, baseUrl }) => createOllamaChat(model, baseUrl),
		modelOptions: ({ model, temperature, maxTokens, options }) => ({
			model,
			options: {
				temperature,
				num_predict: maxTokens,
				num_ctx: DEFAULT_OLLAMA_NUM_CTX,
				...options,
			},
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
 * Assembles the provider-resolved `chat()` options: adapter, base URL,
 * `modelOptions` shape, and the agent loop (server tools auto-execute up to
 * `MAX_AGENT_ROUNDS`).
 */
function baseChatOptions(opts: StreamLLMOptions) {
	const config = PROVIDERS[opts.provider ?? detectProvider(opts.url)];
	const adapter = config.buildAdapter({
		model: opts.model,
		apiKey: opts.apiKey ?? "",
		baseUrl: config.chatBaseUrl(opts.url),
	});
	return {
		adapter,
		messages: opts.messages,
		systemPrompts: opts.systemPrompt ? [opts.systemPrompt] : [],
		modelOptions: config.modelOptions({
			model: opts.model,
			temperature: opts.temperature ?? 0.7,
			maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
			options: opts.options ?? {},
		}),
		threadId: opts.threadId,
		runId: opts.runId,
		...(opts.tools
			? { tools: opts.tools, agentLoopStrategy: maxIterations(MAX_AGENT_ROUNDS) }
			: {}),
	};
}

/**
 * Streams a completion as the raw `@tanstack/ai` (AG-UI) event stream the
 * `@tanstack/ai-client` SSE adapter consumes natively, events verbatim.
 */
export function streamLLMEvents(opts: StreamLLMOptions): AsyncIterable<StreamChunk> {
	return chat({ ...baseChatOptions(opts), stream: true });
}

export type EndpointProbeResult = { ok: true; modelCount: number } | { ok: false; error: string };

/** Strips a trailing `/v1` so `modelsUrl`, which appends its own `/v1/...`, doesn't double it. */
function stripTrailingApiVersion(url: string): string {
	return trimPathRight(url).replace(/\/v1$/, "");
}

/** The model-list request for an endpoint, extracted from {@link listModels} for testing. */
export function buildModelsRequest({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
}): { url: string; headers: Record<string, string> } {
	const config = PROVIDERS[provider ?? detectProvider(url)];
	const base = stripTrailingApiVersion(url);
	return { url: config.modelsUrl({ base, apiKey }), headers: config.modelsHeaders(apiKey) };
}

/**
 * Lists the model ids advertised by an endpoint. An empty array means the
 * endpoint responded OK with no models.
 * @throws On transport or HTTP failure, naming the reason.
 */
export async function listModels({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	/** The endpoint's stored provider; falls back to URL sniffing only when absent. */
	provider?: LLMProvider;
}): Promise<string[]> {
	const config = PROVIDERS[provider ?? detectProvider(url)];
	const request = buildModelsRequest({ url, apiKey, provider });
	const res = await fetch(request.url, {
		headers: request.headers,
		signal: AbortSignal.timeout(8000),
	});
	if (!res.ok) {
		const reason = res.status === 401 || res.status === 403 ? "API key rejected" : res.statusText;
		throw new Error(`${reason} (HTTP ${res.status})`);
	}
	const data: ModelsResponse = await res.json();
	return config.parseModels(data);
}

/**
 * Probes a provider's model-list endpoint with real auth so the test-connection
 * UI can report success with a model count or the precise failure reason.
 */
export async function probeEndpoint({
	url,
	apiKey,
}: {
	url: string;
	apiKey?: string;
}): Promise<EndpointProbeResult> {
	try {
		const models = await listModels({ url, apiKey });
		return { ok: true, modelCount: models.length };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
	}
}
