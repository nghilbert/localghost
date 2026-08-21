import { type ModelMessage, uiMessageToModelMessages } from "@tanstack/ai";
import type { DocumentPart, ImagePart } from "@tanstack/ai/client";
import type { UIMessage } from "@tanstack/ai-client";
import type { Prisma } from "#/generated/prisma/client";

/**
 * Revives `createdAt` back into a real `Date` after a JSONB or RPC round-trip
 * flattens it to a string.
 */
export function reviveMessageDates(messages: Array<ModelMessage>): Array<ModelMessage> {
	return messages.map((message) =>
		message.createdAt ? { ...message, createdAt: new Date(message.createdAt) } : message,
	);
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
 * The seeded first turn as `ChatThread.messages` stores it. The round-trip is what
 * flattens the model messages into the plain JSON values the column accepts; the
 * return type is Prisma's rather than `ModelMessage[]` for the same reason.
 */
export function threadMessagesFrom(
	message: Parameters<typeof buildFirstUserMessage>[0],
): Prisma.InputJsonValue {
	return JSON.parse(JSON.stringify(uiMessageToModelMessages(buildFirstUserMessage(message))));
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

/** Splits on runs of whitespace, dropping empty tokens (a plain-string `/\s+/`). */
function splitOnWhitespace(text: string): string[] {
	const tokens: string[] = [];
	let current = "";
	for (const char of text) {
		if (char.trim() === "") {
			if (current) {
				tokens.push(current);
				current = "";
			}
		} else {
			current += char;
		}
	}
	if (current) tokens.push(current);
	return tokens;
}

/**
 * Derives a chat title from the leading words of the first message.
 * Deterministic and model-free.
 * @returns The derived title, or `null` when the text is blank.
 */
export function deriveConversationTitle(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	return splitOnWhitespace(trimmed).slice(0, 6).join(" ").slice(0, 80);
}
