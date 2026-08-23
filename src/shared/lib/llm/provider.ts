import { z } from "zod/v4";

/** Provider families supported by the LLM and endpoint layers. */
export const llmProviderSchema = z.enum([
	"anthropic",
	"llamacpp",
	"openai",
	"openrouter",
	"groq",
	"gemini",
]);

export type LLMProvider = z.infer<typeof llmProviderSchema>;

/** Narrows a stored provider string, returning undefined when it is unrecognized. */
export function asLLMProvider(value: string): LLMProvider | undefined {
	const parsed = llmProviderSchema.safeParse(value);
	return parsed.success ? parsed.data : undefined;
}

/** Detects a provider family from a bring-your-own endpoint URL. */
export function detectProvider(url: string): LLMProvider {
	const normalized = url.toLowerCase();
	if (normalized.includes("anthropic.com")) return "anthropic";
	if (normalized.includes("generativelanguage.googleapis.com")) return "gemini";
	if (normalized.includes("openrouter.ai")) return "openrouter";
	if (normalized.includes("groq.com")) return "groq";
	// Port 8080 is too common to identify llama.cpp reliably. Runtime discovery
	// stores that provider explicitly; hand-added compatible endpoints use OpenAI.
	return "openai";
}
