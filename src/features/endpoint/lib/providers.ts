import { z } from "zod";
import type { LLMProvider } from "#/lib/llm-provider";

/** A provider a user can add. */
export type ProviderId =
	| "anthropic"
	| "openai"
	| "gemini"
	| "openrouter"
	| "groq"
	| "llamacpp"
	| "custom";

/** What the add form needs to know about a provider. */
export type ProviderDefinition = {
	id: ProviderId;
	label: string;
	defaultName: string;
	/** Prefilled base URL; null means the user must supply one. */
	defaultBaseUrl: string | null;
	/** A starting URL to fill in when `defaultBaseUrl` is null. The URL field stays visible. */
	prefillBaseUrl?: string;
	requiresApiKey: boolean;
	keyPlaceholder?: string;
	keyConsoleUrl?: string;
	description: string;
};

/**
 * The providers a user can add. Local llama.cpp is built in, so it is not listed. Each
 * default URL must be detected as its own provider by `detectProvider`.
 */
export const PROVIDERS: ProviderDefinition[] = [
	{
		id: "anthropic",
		label: "Anthropic",
		defaultName: "Anthropic",
		defaultBaseUrl: "https://api.anthropic.com",
		requiresApiKey: true,
		keyPlaceholder: "sk-ant-...",
		keyConsoleUrl: "https://console.anthropic.com/settings/keys",
		description: "Claude models: strong reasoning, coding, and long context.",
	},
	{
		id: "openai",
		label: "OpenAI",
		defaultName: "OpenAI",
		defaultBaseUrl: "https://api.openai.com",
		requiresApiKey: true,
		keyPlaceholder: "sk-...",
		keyConsoleUrl: "https://platform.openai.com/api-keys",
		description: "GPT models from OpenAI.",
	},
	{
		id: "gemini",
		label: "Google Gemini",
		defaultName: "Google Gemini",
		defaultBaseUrl: "https://generativelanguage.googleapis.com",
		requiresApiKey: true,
		keyPlaceholder: "AIza...",
		keyConsoleUrl: "https://aistudio.google.com/apikey",
		description: "Gemini models from Google: fast, multimodal, long context.",
	},
	{
		id: "openrouter",
		label: "OpenRouter",
		defaultName: "OpenRouter",
		defaultBaseUrl: "https://openrouter.ai/api",
		requiresApiKey: true,
		keyPlaceholder: "sk-or-...",
		keyConsoleUrl: "https://openrouter.ai/settings/keys",
		description: "One key for hundreds of models across providers.",
	},
	{
		id: "groq",
		label: "Groq",
		defaultName: "Groq",
		defaultBaseUrl: "https://api.groq.com/openai",
		requiresApiKey: true,
		keyPlaceholder: "gsk_...",
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

/** The stored provider for a picker choice. */
export function dbProviderFor(id: ProviderId): LLMProvider {
	return id === "custom" ? "openai" : id;
}

/** The picker definition for a stored provider, or the custom OpenAI-compatible one. */
export function providerDefinitionFor(provider: string): ProviderDefinition {
	const match = PROVIDERS.find((p) => p.id !== "custom" && dbProviderFor(p.id) === provider);
	if (match) return match;
	const custom = PROVIDERS.find((p) => p.id === "custom");
	if (!custom) throw new Error("provider registry is missing the custom entry");
	return custom;
}

/**
 * The endpoint form's schema for a provider.
 * @param requireApiKey Whether a key is required. Defaults to the provider's need; pass
 * `false` when editing, where a blank key keeps the current one.
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
