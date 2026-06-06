import { callLLM, type LLMMessage } from "#/lib/llm.server";

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

function getContextLength(model: string): number {
	const lower = model.toLowerCase();
	for (const [key, ctx] of Object.entries(CONTEXT_BY_MODEL)) {
		if (lower.includes(key)) return ctx;
	}
	return DEFAULT_CONTEXT;
}

function estimateTokens(messages: LLMMessage[]): number {
	let total = 0;
	for (const msg of messages) {
		total += 4;
		const content = msg.content;
		if (typeof content === "string") {
			total += Math.floor(content.length * 0.3);
		} else if (Array.isArray(content)) {
			for (const block of content) {
				if (block.type === "text") total += Math.floor(block.text.length * 0.3);
			}
		}
	}
	return total;
}

function contentAsText(content: LLMMessage["content"]): string {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		return content
			.filter((b) => b.type === "text")
			.map((b) => (b.type === "text" ? b.text : ""))
			.join(" ");
	}
	return "";
}

export async function maybeCompact(
	messages: LLMMessage[],
	model: string,
	url: string,
	apiKey?: string,
): Promise<{ messages: LLMMessage[]; compacted: boolean }> {
	const contextLength = getContextLength(model);
	const used = estimateTokens(messages);
	const pct = used / contextLength;

	if (pct < COMPACT_THRESHOLD) return { messages, compacted: false };

	const systemMsgs = messages.filter((m) => m.role === "system");
	const convoMsgs = messages.filter((m) => m.role !== "system");

	if (convoMsgs.length < 4) return { messages, compacted: false };

	const splitPoint = Math.floor(convoMsgs.length / 2);
	const older = convoMsgs.slice(0, splitPoint);
	const recent = convoMsgs.slice(splitPoint);

	const convoText = older
		.map((m) => `${m.role.toUpperCase()}: ${contentAsText(m.content).slice(0, 2000)}`)
		.join("\n");

	try {
		const summary = await callLLM({
			url,
			apiKey,
			model,
			messages: [
				{ role: "system", content: SUMMARY_PROMPT },
				{ role: "user", content: convoText },
			],
			temperature: 0.2,
			maxTokens: SUMMARY_MAX_TOKENS,
		});

		const summaryMsg: LLMMessage = {
			role: "system",
			content: `[Conversation summary — earlier messages were compacted]\n${summary}`,
		};

		return {
			messages: [...systemMsgs, summaryMsg, ...recent],
			compacted: true,
		};
	} catch {
		// Compaction failed — return trimmed history rather than nothing
		return { messages: [...systemMsgs, ...recent], compacted: false };
	}
}
