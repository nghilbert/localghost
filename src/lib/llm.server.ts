import type {
	AnyChatMiddleware,
	AnyServerTool,
	AnyTextAdapter,
	ModelMessage,
	RunAgentResumeItem,
	StreamChunk,
	UIMessage,
} from "@tanstack/ai";
import { chat, createModel, extendAdapter, maxIterations } from "@tanstack/ai";
import { createAnthropicChat } from "@tanstack/ai-anthropic";
import { createGeminiChat } from "@tanstack/ai-gemini";
import { openaiCompatibleText } from "@tanstack/ai-openai/compatible";
import { trimPathRight } from "@tanstack/react-router";
import { log } from "#/lib/log.server";
import { LOCAL_LLAMACPP_API_KEY } from "./llamacpp/client.server";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE } from "./llm-constants";
import { detectProvider, type LLMProvider } from "./llm-provider";

/** Options for {@link streamLLMEvents}. */
type StreamLLMOptions = {
	url: string;
	/** The endpoint's stored provider. Detected from the URL when absent. */
	provider?: LLMProvider;
	apiKey?: string;
	model: string;
	/** Conversation history without a system message; pass `systemPrompt` for that. */
	messages: Array<UIMessage | ModelMessage>;
	systemPrompt?: string;
	temperature?: number;
	maxTokens?: number;
	/** Per-endpoint sampling options. Each present field overrides the default. */
	options?: Record<string, unknown>;
	/** The request's thread id, so run events stay correlated. */
	threadId?: string;
	runId?: string;
	/** Server tools to run automatically; when present the agent loop runs. */
	tools?: AnyServerTool[];
	/** Aborts the provider request. */
	abortController?: AbortController;
	/** Chat middleware, run in array order. */
	middleware?: AnyChatMiddleware[];
	/** Answers to pending interrupts, sent when the client resolves an approval. */
	resume?: Array<RunAgentResumeItem>;
};

const OPENROUTER_REFERER = "https://localghost.app";
const MAX_AGENT_ROUNDS = 10;

/** Model-list response: OpenAI and llama.cpp use `data`, Gemini uses `models`. */
export type ModelsResponse = {
	data?: Array<{ id: string; supported_parameters?: string[] }>;
	models?: Array<{ name: string }>;
};

/** Everything that differs between providers, so the rest of the file has no provider branches. */
type ProviderConfig = {
	/** Normalizes a configured endpoint URL to the base the chat adapter expects. */
	chatBaseUrl: (url: string) => string;
	buildAdapter: (args: { model: string; apiKey: string; baseUrl: string }) => AnyTextAdapter;
	/** The `modelOptions` for a `chat()` call. Providers that ignore sampling `options` drop them. */
	modelOptions: (args: {
		model: string;
		temperature: number;
		maxTokens: number;
		options: Record<string, unknown>;
	}) => Record<string, unknown>;
	modelsHeaders: (apiKey?: string) => Record<string, string>;
	/** The model-list URL, given a base with no trailing slash. */
	modelsUrl: (args: { base: string; apiKey?: string }) => string;
	parseModels: (json: ModelsResponse) => string[];
	/** Whether `model` can call tools. Absent when the provider publishes no such data. */
	parseToolSupport?: (args: { json: ModelsResponse; model: string }) => boolean;
	/** The key to use when none is configured. */
	resolveApiKey?: (apiKey?: string) => string | undefined;
};

/** The key to send to a provider: the endpoint's own, or the provider's default when it has one. */
export function providerApiKey({
	provider,
	apiKey,
}: {
	provider: LLMProvider;
	apiKey?: string;
}): string | undefined {
	const resolve = PROVIDERS[provider].resolveApiKey;
	return resolve ? resolve(apiKey) : apiKey;
}

/** Anthropic accepts temperatures in `[0, 1]` only. */
function clampUnit(value: number): number {
	return Math.min(Math.max(value, 0), 1);
}

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

/** Strips a trailing `/v1`, so callers that append `/v1/...` don't double it. */
function stripTrailingV1(url: string): string {
	const trimmed = trimPathRight(url);
	return trimmed.endsWith("/v1") ? trimmed.slice(0, -"/v1".length) : trimmed;
}

const OPENAI_COMPATIBLE: ProviderConfig = {
	// Normalize to end at `/v1`; the SDK appends `/chat/completions`.
	chatBaseUrl: (url) => {
		const trimmed = trimPathRight(url);
		const base = trimmed.endsWith("/chat/completions")
			? trimmed.slice(0, -"/chat/completions".length)
			: trimmed;
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
		// The SDK appends its own `/v1/...` path.
		chatBaseUrl: (url) => stripTrailingV1(url),
		buildAdapter: ({ model, apiKey, baseUrl }) => {
			// `createAnthropicChat` only types a fixed model list; register this one so any name is accepted.
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
			// `createGeminiChat` only types a fixed model list; register this one so any name is accepted.
			const factory = extendAdapter(createGeminiChat, [
				createModel(model, ["text", "image", "document"]),
			]);
			return factory(model, apiKey, { httpOptions: { baseUrl } });
		},
		modelOptions: ({ temperature, maxTokens }) => ({
			temperature,
			maxOutputTokens: maxTokens,
		}),
		// Gemini takes the key as a `?key=` query parameter.
		modelsHeaders: () => ({ "Content-Type": "application/json" }),
		modelsUrl: ({ base, apiKey }) => `${base}/v1beta/models?key=${apiKey ?? ""}`,
		parseModels: (json) =>
			(json.models ?? []).map((m) => (m.name.startsWith("models/") ? m.name.slice(7) : m.name)),
	},
	llamacpp: {
		...OPENAI_COMPATIBLE,
		// The SDK requires a key, and the bundled server enforces `--api-key` on every route
		// but `/health`. A configured endpoint key wins.
		resolveApiKey: (apiKey) => apiKey || LOCAL_LLAMACPP_API_KEY,
		// In router mode `/models` also lists downloaded but unloaded models; `/v1/models` may not.
		modelsUrl: ({ base }) => `${base}/models`,
		parseModels: (json) => (json.data ?? []).map((m) => m.id),
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
		parseToolSupport: ({ json, model }) => {
			const entry = (json.data ?? []).find((m) => m.id === model);
			return entry?.supported_parameters?.includes("tools") ?? true;
		},
	},
	groq: OPENAI_COMPATIBLE,
	openai: OPENAI_COMPATIBLE,
};

/** The chat base URL the provider's adapter expects for a configured endpoint URL. */
export function chatBaseUrl({ url, provider }: { url: string; provider?: LLMProvider }): string {
	return PROVIDERS[provider ?? detectProvider(url)].chatBaseUrl(url);
}

function baseChatOptions(opts: StreamLLMOptions) {
	const provider = opts.provider ?? detectProvider(opts.url);
	const config = PROVIDERS[provider];
	const adapter = config.buildAdapter({
		model: opts.model,
		apiKey: providerApiKey({ provider, apiKey: opts.apiKey }) ?? "",
		baseUrl: chatBaseUrl({ url: opts.url, provider: opts.provider }),
	});
	return {
		adapter,
		messages: opts.messages,
		systemPrompts: opts.systemPrompt ? [opts.systemPrompt] : [],
		modelOptions: config.modelOptions({
			model: opts.model,
			temperature: opts.temperature ?? DEFAULT_TEMPERATURE,
			maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
			options: opts.options ?? {},
		}),
		threadId: opts.threadId,
		runId: opts.runId,
		...(opts.abortController ? { abortController: opts.abortController } : {}),
		...(opts.tools
			? { tools: opts.tools, agentLoopStrategy: maxIterations(MAX_AGENT_ROUNDS) }
			: {}),
		...(opts.middleware ? { middleware: opts.middleware } : {}),
		...(opts.resume ? { resume: opts.resume } : {}),
	};
}

/** Streams a completion as `@tanstack/ai` events, ready for an SSE response. */
export function streamLLMEvents(opts: StreamLLMOptions): AsyncIterable<StreamChunk> {
	return chat({ ...baseChatOptions(opts), stream: true });
}

/** The result of {@link probeEndpoint}: a model count, or why the request failed. */
export type EndpointProbeResult = { ok: true; modelCount: number } | { ok: false; error: string };

/** The URL and headers for an endpoint's model-list request. */
export function buildModelsRequest({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
}): { url: string; headers: Record<string, string> } {
	const resolvedProvider = provider ?? detectProvider(url);
	const config = PROVIDERS[resolvedProvider];
	const base = stripTrailingV1(url);
	const resolvedApiKey = providerApiKey({ provider: resolvedProvider, apiKey });
	return {
		url: config.modelsUrl({ base, apiKey: resolvedApiKey }),
		headers: config.modelsHeaders(resolvedApiKey),
	};
}

/**
 * Fetches an endpoint's model list.
 * @throws On a network or HTTP failure, naming the reason.
 */
async function fetchModels({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
}): Promise<ModelsResponse> {
	const request = buildModelsRequest({ url, apiKey, provider });
	const res = await fetch(request.url, {
		headers: request.headers,
		signal: AbortSignal.timeout(8000),
	});
	if (!res.ok) {
		const reason = res.status === 401 || res.status === 403 ? "API key rejected" : res.statusText;
		throw new Error(`${reason} (HTTP ${res.status})`);
	}
	return res.json();
}

/**
 * Lists the model ids an endpoint advertises.
 * @throws On a network or HTTP failure, naming the reason.
 */
export async function listModels({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
}): Promise<string[]> {
	const json = await fetchModels({ url, apiKey, provider });
	return PROVIDERS[provider ?? detectProvider(url)].parseModels(json);
}

/**
 * Whether a model can call tools, per the provider's model list. Unknown means yes, so a
 * failed lookup never blocks a working model.
 */
export async function modelSupportsTools({
	url,
	apiKey,
	provider,
	model,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
	model: string;
}): Promise<boolean> {
	const config = PROVIDERS[provider ?? detectProvider(url)];
	if (!config.parseToolSupport) return true;
	try {
		const json = await fetchModels({ url, apiKey, provider });
		return config.parseToolSupport({ json, model });
	} catch (error) {
		log.warn(
			{ err: error, url, model },
			"Tool-support probe failed; assuming the model is capable",
		);
		return true;
	}
}

/** Tests an endpoint's connection and key by listing its models. */
export async function probeEndpoint({
	url,
	apiKey,
	provider,
}: {
	url: string;
	apiKey?: string;
	provider?: LLMProvider;
}): Promise<EndpointProbeResult> {
	try {
		const models = await listModels({ url, apiKey, provider });
		return { ok: true, modelCount: models.length };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
	}
}
