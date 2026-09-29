import type { ModelMessage } from "@tanstack/ai";
import type { DocumentPart, ImagePart } from "@tanstack/ai/client";
import type { UIMessage } from "@tanstack/ai-client";

/** Turns `createdAt` back into a `Date` after JSON serialization made it a string. */
export function reviveMessageDates(messages: Array<ModelMessage>): Array<ModelMessage> {
	return messages.map((message) =>
		message.createdAt ? { ...message, createdAt: new Date(message.createdAt) } : message,
	);
}

/**
 * Detects a reply that is only a tool call written as JSON text, which small models
 * sometimes produce instead of calling the tool.
 * @returns The tool name, or null for normal content.
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

/** A message's text parts joined, without tool calls, results, or thinking. */
export function partsText(parts: UIMessage["parts"]): string {
	return parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}

/** Image message parts for attachments, each with a data URL source. */
export function imageMessageParts(images: Array<{ dataUrl: string }>): ImagePart[] {
	return images.map(
		(image): ImagePart => ({
			type: "image",
			source: { type: "url", value: image.dataUrl },
		}),
	);
}

/** The URLs of a message's images, in order. */
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

/** Document message parts for attachments, with the filename in metadata for display. */
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

/** The filename in a document part's metadata, or "Document". */
function documentFilename(metadata: unknown): string {
	return typeof metadata === "object" &&
		metadata !== null &&
		"filename" in metadata &&
		typeof metadata.filename === "string"
		? metadata.filename
		: "Document";
}

/** The name and MIME type of each document on a message, in order. */
export function messageDocumentSources(
	parts: UIMessage["parts"],
): Array<{ name: string; mimeType: string }> {
	return parts.flatMap((part) =>
		part.type === "document" && part.source.type === "data"
			? [{ name: documentFilename(part.metadata), mimeType: part.source.mimeType }]
			: [],
	);
}

/** The first user message of a new conversation, with its attachments. */
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
 * Replaces a user message's text and drops every message after it, ready to resend.
 * @returns The shortened transcript, or `messages` unchanged when `id` is not found.
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
	const mediaParts = target.parts.filter(
		(part) => part.type === "image" || part.type === "document",
	);
	const edited: UIMessage = { ...target, parts: [...mediaParts, { type: "text", content }] };
	return [...messages.slice(0, messages.indexOf(target)), edited];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * How long the run that produced a message took, in whole seconds, from the timings
 * `reconstructChat` adds with `includeRuns`.
 * @returns The seconds, or `null` when the message has no finished run.
 */
export function turnSeconds(message: UIMessage): number | null {
	const tanstack: unknown = message.metadata?.tanstack;
	if (!isRecord(tanstack) || !isRecord(tanstack.run)) return null;
	const { startedAt, finishedAt } = tanstack.run;
	if (typeof startedAt !== "number" || typeof finishedAt !== "number") return null;
	return Math.round((finishedAt - startedAt) / 1000);
}

/** Whether the transcript ends on a user message that has no reply yet. */
export function awaitingAssistantResponse(messages: Array<UIMessage>): boolean {
	const last = messages.at(-1);
	return last?.role === "user";
}

/**
 * A chat title from the first words of the first message.
 * @returns The title, or `null` when the text is blank.
 */
export function deriveConversationTitle(text: string): string | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	return trimmed.split(/\s+/).slice(0, 6).join(" ").slice(0, 80);
}
