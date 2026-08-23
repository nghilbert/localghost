import { z } from "zod/v4";
import type { LLMProvider } from "#/shared/lib/llm/provider";

export type ProviderId =
	| "anthropic"
	| "openai"
	| "gemini"
	| "openrouter"
	| "groq"
	| "llamacpp"
	| "custom";

export type ProviderDefinition = {
	id: ProviderId;
	label: string;
	defaultName: string;
	/** Prefilled base URL; null means the user must supply one. */
	defaultBaseUrl: string | null;
	/**
	 * Seed value/placeholder for the URL field when `defaultBaseUrl` is null but a
	 * sensible starting point exists (e.g. local llama.cpp). Unlike `defaultBaseUrl`
	 * it carries no API-key requirement and the URL field stays directly visible.
	 */
	prefillBaseUrl?: string;
	requiresApiKey: boolean;
	keyPlaceholder?: string;
	keyConsoleUrl?: string;
	description: string;
};

/**
 * Selectable providers for the guided add-endpoint picker. The built-in local
 * llama.cpp is deliberately absent; it is never "added". Default base URLs must
 * round-trip through detectProvider() in llm.server.ts; pinned by a unit test.
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
		description: "Claude models: strong reasoning, coding, and long context.",
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
		id: "gemini",
		label: "Google Gemini",
		defaultName: "Google Gemini",
		defaultBaseUrl: "https://generativelanguage.googleapis.com",
		requiresApiKey: true,
		keyPlaceholder: "AIza…",
		keyConsoleUrl: "https://aistudio.google.com/apikey",
		description: "Gemini models from Google: fast, multimodal, long context.",
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
		id: "custom",
		label: "Custom (OpenAI-compatible)",
		defaultName: "Custom provider",
		defaultBaseUrl: null,
		requiresApiKey: false,
		description: "Any OpenAI-compatible API, like vLLM or LM Studio.",
	},
];

/** Maps a picker choice onto the provider value stored on Endpoint. */
export function dbProviderFor(id: ProviderId): LLMProvider {
	return id === "custom" ? "openai" : id;
}

/**
 * The picker definition backing a stored endpoint's provider, so the edit form
 * can reuse its key guidance and placeholders. Falls back to the custom
 * definition, which every OpenAI-compatible server (including plain `openai`) fits.
 */
export function providerDefinitionFor(provider: string): ProviderDefinition {
	const match = PROVIDERS.find((p) => p.id !== "custom" && dbProviderFor(p.id) === provider);
	if (match) return match;
	const custom = PROVIDERS.find((p) => p.id === "custom");
	if (!custom) throw new Error("provider registry is missing the custom entry");
	return custom;
}

/**
 * @param requireApiKey Whether the key field is mandatory. Defaults to the
 * provider's own requirement; the edit form passes `false` so a blank key means
 * "keep the existing one" rather than a validation error.
 */
export function buildEndpointFormSchema({
	definition,
	requireApiKey = definition.requiresApiKey,
}: {
	definition: ProviderDefinition;
	requireApiKey?: boolean;
}) {
	return z.object({
		name: z.string().trim().min(1, "Name is required").max(100),
		url: z.url("Must be a valid URL").max(2048),
		apiKey: requireApiKey ? z.string().min(1, "API key is required") : z.string(),
	});
}
