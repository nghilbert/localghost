import type { ModelMessage } from "@tanstack/ai";
import type { DocumentPart, ImagePart, RunFinishedEvent } from "@tanstack/ai/client";
import type { UIMessage } from "@tanstack/ai-client";
import { DEFAULT_MAX_TOKENS } from "#/shared/lib/llm-constants";

const MAX_HISTORY_MESSAGES = 40;

/** Options tuning where {@link historyStartIndex} cuts the transcript. */
type HistoryTrimOptions = {
	/**
	 * The token budget for prior history. When set, the cut fits the window to it
	 * instead of the fixed message-count cap; from {@link historyBudgetTokens}.
	 */
	historyBudgetTokens?: number;
};

/**
 * The index of the first message still sent to the model, 0 when nothing is
 * trimmed. The cut only lands on a user message: starting mid-turn can sever a
 * tool call from its result, which OpenAI-compatible providers 400 on. With a
 * `historyBudgetTokens`, it fits the window to that token budget; otherwise it
 * falls back to a fixed message-count cap.
 */
export function historyStartIndex(
	messages: Array<UIMessage | ModelMessage>,
	options?: HistoryTrimOptions,
): number {
	const budget = options?.historyBudgetTokens;
	return budget === undefined
		? countBasedStartIndex(messages)
		: tokenBasedStartIndex(messages, budget);
}

/** The message-count cut used when no token budget is known (cloud windows are large/unknown). */
function countBasedStartIndex(messages: Array<UIMessage | ModelMessage>): number {
	if (messages.length <= MAX_HISTORY_MESSAGES) return 0;
	const windowStart = messages.length - MAX_HISTORY_MESSAGES;
	for (let i = windowStart; i < messages.length; i++) {
		if (messages[i]?.role === "user") return i;
	}
	// No user turn inside the window (one giant tool loop): keep the whole last
	// user turn even though it runs over the cap; severing it is worse.
	return lastUserIndex(messages, windowStart - 1);
}

/**
 * The earliest user message whose window (that message and everything newer)
 * still fits `budget` estimated tokens. Walks back from the newest message so
 * the freshest turns are always kept; if even the last user turn overflows, that
 * turn is kept whole rather than severed.
 */
function tokenBasedStartIndex(messages: Array<UIMessage | ModelMessage>, budget: number): number {
	let total = 0;
	let cut = -1;
	for (let i = messages.length - 1; i >= 0; i--) {
		const message = messages[i];
		if (!message) continue;
		total += estimateMessageTokens(message);
		if (message.role !== "user") continue;
		if (total <= budget) {
			cut = i;
			continue;
		}
		// Adding this user turn overflows; any older cut only carries more tokens.
		break;
	}
	// Nothing fit (the newest user turn alone is over budget): keep that turn.
	return cut === -1 ? lastUserIndex(messages, messages.length - 1) : cut;
}

/** The index of the last user message at or before `from`, or 0 when there is none. */
function lastUserIndex(messages: Array<UIMessage | ModelMessage>, from: number): number {
	for (let i = from; i >= 0; i--) {
		if (messages[i]?.role === "user") return i;
	}
	return 0;
}

/** Caps history to the window {@link historyStartIndex} chooses. */
export function trimHistory(
	messages: Array<UIMessage | ModelMessage>,
	options?: HistoryTrimOptions,
) {
	const start = historyStartIndex(messages, options);
	return start === 0 ? messages : messages.slice(start);
}

/**
 * Detects an assistant reply that is nothing but a tool-call JSON blob: a
 * small model writing the call as prose instead of invoking it.
 * @returns The tool name it tried to call, or null for normal content.
 */
export function strandedToolCall(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return null;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (typeof parsed !== "object" || parsed === null || !("name" in parsed)) return null;
		const args =
			"parameters" in parsed ? parsed.parameters : "arguments" in parsed ? parsed.arguments : null;
		if (typeof parsed.name !== "string" || typeof args !== "object" || args === null) return null;
		return parsed.name;
	} catch {
		return null;
	}
}

/**
 * Joins a message's text parts into plain text, skipping tool calls, results,
 * and thinking: the readable transcript used for export and auto-naming.
 */
export function partsText(parts: UIMessage["parts"]): string {
	return parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}

/** The image `UIMessage` parts for a set of attachments, each a data-URL source. */
export function imageMessageParts(images: Array<{ dataUrl: string }>): ImagePart[] {
	return images.map(
		(image): ImagePart => ({
			type: "image",
			source: { type: "url", value: image.dataUrl },
		}),
	);
}

/** The renderable sources of a message's image parts, in order; empty when none. */
export function messageImageSources(parts: UIMessage["parts"]): string[] {
	return parts.flatMap((part) =>
		part.type === "image" && part.source.type === "url" ? [part.source.value] : [],
	);
}

/** The base64 payload of a data URL, dropping its `data:<mime>;base64,` prefix. */
function dataUrlToBase64(dataUrl: string): string {
	const comma = dataUrl.indexOf(",");
	return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

/**
 * The document `UIMessage` parts for a set of attachments, each an inline base64
 * data source (mimeType is required there). The filename rides along in metadata
 * so the transcript can label the chip; providers ignore unknown metadata.
 */
export function documentMessageParts(
	documents: Array<{ dataUrl: string; mimeType: string; name: string }>,
): DocumentPart[] {
	return documents.map(
		(document): DocumentPart => ({
			type: "document",
			source: {
				type: "data",
				value: dataUrlToBase64(document.dataUrl),
				mimeType: document.mimeType,
			},
			metadata: { filename: document.name },
		}),
	);
}

/** The filename stashed in a document part's metadata, or a generic fallback. */
function documentFilename(metadata: unknown): string {
	return typeof metadata === "object" &&
		metadata !== null &&
		"filename" in metadata &&
		typeof metadata.filename === "string"
		? metadata.filename
		: "Document";
}

/** The document attachments carried on a message (name + mime), in order; empty when none. */
export function messageDocumentSources(
	parts: UIMessage["parts"],
): Array<{ name: string; mimeType: string }> {
	return parts.flatMap((part) =>
		part.type === "document" && part.source.type === "data"
			? [{ name: documentFilename(part.metadata), mimeType: part.source.mimeType }]
			: [],
	);
}

/**
 * Reads the `messages` JSONB blob back as the ai-client's `UIMessage[]`.
 * The one trust boundary between the stored blob and the typed transcript.
 */
export function storedMessages(value: unknown): UIMessage[] {
	return JSON.parse(JSON.stringify(value ?? []));
}

/**
 * Builds the user `UIMessage` a conversation is created with, so the first
 * message lives in the database from the moment the conversation exists instead
 * of riding along in navigation state.
 */
export function buildFirstUserMessage({
	content,
	images = [],
	documents = [],
}: {
	content: string;
	images?: Array<{ dataUrl: string }>;
	documents?: Array<{ dataUrl: string; mimeType: string; name: string }>;
}): UIMessage {
	const textParts: UIMessage["parts"] = content ? [{ type: "text", content }] : [];
	return {
		id: crypto.randomUUID(),
		role: "user",
		parts: [...imageMessageParts(images), ...documentMessageParts(documents), ...textParts],
		createdAt: new Date(),
	};
}

/**
 * Flags the trailing assistant message as interrupted (the user hit stop), so
 * the transcript can say so instead of presenting cut-off text as complete.
 * @returns A new flagged array; unchanged when the last turn isn't assistant.
 */
export function markInterrupted(messages: UIMessage[]): UIMessage[] {
	const last = messages.at(-1);
	if (last?.role !== "assistant") return messages;
	const flagged: UIMessage & { interrupted: boolean } = { ...last, interrupted: true };
	return [...messages.slice(0, -1), flagged];
}

/** Whether {@link markInterrupted} flagged this message when its generation was stopped. */
export function isInterrupted(message: UIMessage): boolean {
	return "interrupted" in message && message.interrupted === true;
}

/** Token counts for one assistant reply, the subset of the stream's usage we display. */
export type MessageUsage = Pick<
	NonNullable<RunFinishedEvent["usage"]>,
	"promptTokens" | "completionTokens" | "totalTokens"
>;

/** Stamps a completed message with its reported token usage. */
export function withUsage(message: UIMessage, usage: MessageUsage): UIMessage {
	const stamped: UIMessage & { usage: MessageUsage } = { ...message, usage };
	return stamped;
}

/** The token usage {@link withUsage} stamped on this message, if any. */
export function messageUsage(message: UIMessage | ModelMessage): MessageUsage | null {
	return "usage" in message && message.usage ? (message.usage as MessageUsage) : null;
}

/** Tokens reserved above `max_tokens` for the system prompt (date grounding + tool directives). */
const SYSTEM_PROMPT_RESERVE_TOKENS = 1500;

/** A conservative flat token cost per image part; vision token accounting varies by provider. */
const IMAGE_TOKEN_ESTIMATE = 1000;

/**
 * A rough token size for one message, for the token-budget trim: an assistant
 * reply's own reported `completionTokens` when known, otherwise a chars/4
 * estimate of its text plus a flat cost per image. (Never `totalTokens` — that
 * already folds in the whole prior prompt and would multiply-count on a walk.)
 */
export function estimateMessageTokens(message: UIMessage | ModelMessage): number {
	const completion = messageUsage(message)?.completionTokens;
	if (typeof completion === "number") return completion;

	const parts = "parts" in message ? message.parts : null;
	const text = parts
		? partsText(parts)
		: "content" in message && typeof message.content === "string"
			? message.content
			: "";
	const imageCount = parts ? parts.filter((part) => part.type === "image").length : 0;
	return Math.ceil(text.length / 4) + imageCount * IMAGE_TOKEN_ESTIMATE;
}

/**
 * The token budget available for prior history on the next request, or
 * `undefined` when the context window is large or unknown (cloud providers)
 * and history is bounded by message count instead. Local runtimes report a
 * real, small `n_ctx` (read live from llama-server's `/props`); the budget
 * subtracts the output reservation (`max_tokens`) and headroom for the system
 * prompt so the window it keeps actually fits.
 */
export function historyBudgetTokens({
	nCtx,
	options,
}: {
	nCtx: number | undefined;
	options: Record<string, unknown>;
}): number | undefined {
	if (nCtx === undefined) return undefined;
	const maxTokens =
		typeof options.max_tokens === "number" ? options.max_tokens : DEFAULT_MAX_TOKENS;
	return Math.max(0, nCtx - maxTokens - SYSTEM_PROMPT_RESERVE_TOKENS);
}

/**
 * Running total tokens spent so far, one entry per message in order (the
 * context-budget view local models care about). Messages without usage add 0.
 */
export function cumulativeTokenTotals(messages: UIMessage[]): number[] {
	let sum = 0;
	return messages.map((message) => {
		sum += messageUsage(message)?.totalTokens ?? 0;
		return sum;
	});
}

/**
 * Rewrites a user message's text and drops every turn after it: editing a
 * sent message is replace-and-resend, not branching.
 * @returns The truncated transcript, or the input unchanged if `id` isn't found.
 */
export function editUserMessage({
	messages,
	id,
	content,
}: {
	messages: UIMessage[];
	id: string;
	content: string;
}): UIMessage[] {
	const target = messages.find((message) => message.id === id);
	if (!target) return messages;
	// Keep the message's image and document parts; editing rewrites only its text.
	const mediaParts = target.parts.filter(
		(part) => part.type === "image" || part.type === "document",
	);
	const edited: UIMessage = { ...target, parts: [...mediaParts, { type: "text", content }] };
	return [...messages.slice(0, messages.indexOf(target)), edited];
}

/**
 * Whether the transcript ends on a user message with no assistant reply yet:
 * the signal for the conversation view to request a response via `reload()`.
 */
export function awaitingAssistantResponse(messages: Array<UIMessage>): boolean {
	const last = messages.at(-1);
	return last?.role === "user";
}

/**
 * Derives a chat title from the leading words of the first message.
 * Deterministic and model-free.
 * @returns The derived title, or `null` when the text is blank.
 */
export function deriveConversationTitle(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	return trimmed.split(/\s+/).slice(0, 6).join(" ").slice(0, 80);
}
