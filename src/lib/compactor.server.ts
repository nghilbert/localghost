import type { ModelMessage } from "@tanstack/ai";
import { callLLM } from "#/lib/llm.server";

const COMPACT_THRESHOLD = 0.85;
const SUMMARY_MAX_TOKENS = 1024;
const DEFAULT_CONTEXT = 128_000;

const CONTEXT_BY_MODEL: Record<string, number> = {
	"claude-sonnet-4-6": 200_000,
	"claude-sonnet-4-5": 200_000,
	"claude-sonnet-4": 200_000,
	"claude-opus-4": 200_000,
	"claude-haiku-4": 200_000,
	"claude-haiku-4-5": 200_000,
	"claude-3-5-sonnet": 200_000,
	"claude-3-5-haiku": 200_000,
	"claude-3-opus": 200_000,
	"claude-3-sonnet": 200_000,
	"claude-3-haiku": 200_000,
	"gpt-4o": 128_000,
	"gpt-4o-mini": 128_000,
	"gpt-4-turbo": 128_000,
	o1: 200_000,
	"o1-mini": 128_000,
	o3: 200_000,
	"o3-mini": 200_000,
	"o4-mini": 200_000,
	"gemma-3": 128_000,
	"mistral-large": 128_000,
	"command-r-plus": 128_000,
	"command-r": 128_000,
	"sonar-pro": 200_000,
	sonar: 128_000,
	"llama-3": 128_000,
	"llama-3.1": 128_000,
	"llama-3.2": 128_000,
	"llama-3.3": 128_000,
	"qwen-2.5": 128_000,
	qwen3: 128_000,
	deepseek: 64_000,
};

const SUMMARY_PROMPT = `You are summarizing a conversation to preserve context after compaction. Produce a structured summary that lets the conversation continue seamlessly.

Use this format:

## Conversation Summary

### User Goal
One sentence describing what the user is trying to accomplish.

### What Was Done
- Bullet points of completed actions, decisions made, and key outputs
- Include specific file paths, function names, variable names, and config values
- Note any errors encountered and how they were resolved

### Current State
What is the system/task state right now? What was the last thing discussed?

### Pending / Next Steps
- What remains to be done
- Any open questions or blockers

### Key Context
- Important constraints, preferences, or decisions that must not be forgotten

Keep the summary under 800 tokens. Be dense — every token should carry information.`;

/** Resolves a model id to its context-window size in tokens, defaulting to {@link DEFAULT_CONTEXT}. */
function getContextLength(model: string): number {
	const lower = model.toLowerCase();
	for (const [key, ctx] of Object.entries(CONTEXT_BY_MODEL)) {
		if (lower.includes(key)) return ctx;
	}
	return DEFAULT_CONTEXT;
}

/** Flattens a `ModelMessage`'s content to plain text, joining text parts and dropping non-text ones. */
function contentAsText(content: ModelMessage["content"]): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content.flatMap((part) => (part.type === "text" ? [part.content] : [])).join(" ");
	}
	return "";
}

/** Roughly estimates a message list's token count (~0.3 tokens/char plus per-message overhead). */
function estimateTokens(messages: ModelMessage[]): number {
	let total = 0;
	for (const msg of messages) {
		total += 4;
		total += Math.floor(contentAsText(msg.content).length * 0.3);
	}
	return total;
}

/**
 * Summarizes the older half of a conversation once it crosses
 * {@link COMPACT_THRESHOLD} of the model's context window, preserving the recent
 * half and folding the summary into the system prompt (the `ModelMessage` model
 * has no `system` role). On summarization failure it falls back to the trimmed
 * recent history, so the caller always receives a usable message list.
 *
 * @param messages - The conversation history (roles user/assistant/tool — no system).
 * @param systemPrompt - The active system prompt; the summary is appended to it on compaction.
 * @param model - The model id, used to look up its context-window size.
 * @param url - Endpoint URL used to generate the summary.
 * @param apiKey - Optional bearer key for the summary request.
 * @returns The (possibly compacted) messages, the (possibly augmented) system prompt, and whether compaction occurred.
 */
export async function maybeCompact(
	messages: ModelMessage[],
	systemPrompt: string | undefined,
	model: string,
	url: string,
	apiKey?: string,
): Promise<{ messages: ModelMessage[]; systemPrompt: string | undefined; compacted: boolean }> {
	const contextLength = getContextLength(model);
	const used =
		estimateTokens(messages) + (systemPrompt ? Math.floor(systemPrompt.length * 0.3) : 0);
	const pct = used / contextLength;

	if (pct < COMPACT_THRESHOLD) return { messages, systemPrompt, compacted: false };
	if (messages.length < 4) return { messages, systemPrompt, compacted: false };

	const splitPoint = Math.floor(messages.length / 2);
	const older = messages.slice(0, splitPoint);
	const recent = messages.slice(splitPoint);

	const convoText = older
		.map((m) => `${m.role.toUpperCase()}: ${contentAsText(m.content).slice(0, 2000)}`)
		.join("\n");

	try {
		const summary = await callLLM({
			url,
			apiKey,
			model,
			systemPrompt: SUMMARY_PROMPT,
			messages: [{ role: "user", content: convoText }],
			temperature: 0.2,
			maxTokens: SUMMARY_MAX_TOKENS,
		});

		const summaryNote = `[Conversation summary — earlier messages were compacted]\n${summary}`;
		const mergedSystemPrompt = systemPrompt ? `${systemPrompt}\n\n${summaryNote}` : summaryNote;

		return { messages: recent, systemPrompt: mergedSystemPrompt, compacted: true };
	} catch {
		// Compaction failed — return trimmed recent history rather than nothing
		return { messages: recent, systemPrompt, compacted: false };
	}
}
