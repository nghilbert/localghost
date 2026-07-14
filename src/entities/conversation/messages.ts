import type { ModelMessage } from "@tanstack/ai";
import type { ImagePart } from "@tanstack/ai/client";
import type { UIMessage } from "@tanstack/ai-client";

const MAX_HISTORY_MESSAGES = 40;

/**
 * The index of the first message still sent to the model, 0 when nothing is
 * trimmed. The cut only lands on a user message: starting mid-turn can sever a
 * tool call from its result, which OpenAI-compatible providers 400 on.
 */
export function historyStartIndex(messages: Array<UIMessage | ModelMessage>): number {
	if (messages.length <= MAX_HISTORY_MESSAGES) return 0;
	const windowStart = messages.length - MAX_HISTORY_MESSAGES;
	for (let i = windowStart; i < messages.length; i++) {
		if (messages[i]?.role === "user") return i;
	}
	// No user turn inside the window (one giant tool loop): keep the whole last
	// user turn even though it runs over the cap; severing it is worse.
	for (let i = windowStart - 1; i >= 0; i--) {
		if (messages[i]?.role === "user") return i;
	}
	return windowStart;
}

/** Caps history to the window {@link historyStartIndex} chooses. */
export function trimHistory(messages: Array<UIMessage | ModelMessage>) {
	const start = historyStartIndex(messages);
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
}: {
	content: string;
	images?: Array<{ dataUrl: string }>;
}): UIMessage {
	const textParts: UIMessage["parts"] = content ? [{ type: "text", content }] : [];
	return {
		id: crypto.randomUUID(),
		role: "user",
		parts: [...imageMessageParts(images), ...textParts],
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
	// Keep the message's image parts; editing rewrites only its text.
	const imageParts = target.parts.filter((part) => part.type === "image");
	const edited: UIMessage = { ...target, parts: [...imageParts, { type: "text", content }] };
	return [...messages.slice(0, messages.indexOf(target)), edited];
}

/**
 * Cleans model output into a title: thinking blocks dropped, first non-empty
 * line, quote/markdown wrapping stripped, capped at 80 chars.
 * @returns The cleaned title, or `null` when nothing usable remains.
 */
export function sanitizeGeneratedTitle(text: string): string | null {
	const line = text
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		.split("\n")
		.map((candidate) => candidate.trim())
		.find(Boolean);
	if (!line) return null;
	const cleaned = line
		.replace(/^title:\s*/i, "")
		.replace(/^["'“”*`]+|["'“”*`.]+$/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return cleaned ? cleaned.slice(0, 80) : null;
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
