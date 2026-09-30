import { z } from "zod";

/** Provider families supported by the LLM and endpoint layers. */
export const llmProviderSchema = z.enum([
	"anthropic",
	"llamacpp",
	"openai",
	"openrouter",
	"groq",
	"gemini",
]);

/** A supported provider family. */
export type LLMProvider = z.infer<typeof llmProviderSchema>;

/** Narrows a stored provider string, or returns undefined when it is unknown. */
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
	// A llama.cpp URL looks like any OpenAI-compatible server, so discovery stores that provider explicitly.
	return "openai";
}
