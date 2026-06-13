import { z } from "zod/v4";

export type ProviderId = "anthropic" | "openai" | "openrouter" | "groq" | "ollama" | "custom";

export type DbProvider = "openai" | "anthropic" | "ollama" | "openrouter" | "groq";

export type ProviderDefinition = {
	id: ProviderId;
	label: string;
	defaultName: string;
	/** Prefilled base URL; null means the user must supply one. */
	defaultBaseUrl: string | null;
	/**
	 * Seed value/placeholder for the URL field when `defaultBaseUrl` is null but a
	 * sensible starting point exists (e.g. local Ollama). Unlike `defaultBaseUrl`
	 * it carries no API-key requirement and the URL field stays directly visible.
	 */
	prefillBaseUrl?: string;
	requiresApiKey: boolean;
	keyPlaceholder?: string;
	keyConsoleUrl?: string;
	description: string;
};

/**
 * Known providers for the guided picker. Default base URLs must round-trip
 * through detectProvider() in llm.server.ts so chat routes requests correctly
 * — pinned by a unit test.
 */
export const PROVIDERS: ProviderDefinition[] = [
	{
		id: "anthropic",
		label: "Anthropic",
		defaultName: "Anthropic",
		defaultBaseUrl: "https://api.anthropic.com",
		requiresApiKey: true,
		keyPlaceholder: "sk-ant-…",
		keyConsoleUrl: "https://console.anthropic.com/settings/keys",
		description: "Claude models — strong reasoning, coding, and long context.",
	},
	{
		id: "openai",
		label: "OpenAI",
		defaultName: "OpenAI",
		defaultBaseUrl: "https://api.openai.com",
		requiresApiKey: true,
		keyPlaceholder: "sk-…",
		keyConsoleUrl: "https://platform.openai.com/api-keys",
		description: "GPT models from OpenAI.",
	},
	{
		id: "openrouter",
		label: "OpenRouter",
		defaultName: "OpenRouter",
		defaultBaseUrl: "https://openrouter.ai/api",
		requiresApiKey: true,
		keyPlaceholder: "sk-or-…",
		keyConsoleUrl: "https://openrouter.ai/settings/keys",
		description: "One key for hundreds of models across providers.",
	},
	{
		id: "groq",
		label: "Groq",
		defaultName: "Groq",
		defaultBaseUrl: "https://api.groq.com/openai",
		requiresApiKey: true,
		keyPlaceholder: "gsk_…",
		keyConsoleUrl: "https://console.groq.com/keys",
		description: "Very fast inference for open models.",
	},
	{
		id: "ollama",
		label: "Ollama (local)",
		defaultName: "Ollama (local)",
		defaultBaseUrl: null,
		prefillBaseUrl: "http://localhost:11434",
		requiresApiKey: false,
		description: "Run models on your own hardware — no API key needed.",
	},
	{
		id: "custom",
		label: "Custom (OpenAI-compatible)",
		defaultName: "Custom provider",
		defaultBaseUrl: null,
		requiresApiKey: false,
		description: "Any OpenAI-compatible API, like vLLM, LM Studio, or llama.cpp.",
	},
];

/** Maps a picker choice onto the provider value stored on ModelEndpoint. */
export function dbProviderFor(id: ProviderId): DbProvider {
	return id === "custom" ? "openai" : id;
}

export function buildEndpointFormSchema(definition: ProviderDefinition) {
	return z.object({
		name: z.string().trim().min(1, "Name is required").max(100),
		url: z.url("Must be a valid URL").max(2048),
		apiKey: definition.requiresApiKey ? z.string().min(1, "API key is required") : z.string(),
	});
}
