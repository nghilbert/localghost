import type { UIMessage } from "@tanstack/ai-client";
import { isInterrupted, messageImageSources, partsText } from "./messages";

/** The conversation fields an export renders; a subset of `ConversationDetail`. */
export interface ExportableConversation {
	title: string | null;
	messages: UIMessage[];
}

const ROLE_HEADINGS: Record<UIMessage["role"], string> = {
	system: "System",
	user: "User",
	assistant: "Assistant",
};

/** One message as a markdown section: a role heading, image notes, then its text. */
function messageMarkdown(message: UIMessage): string {
	const lines: string[] = [`## ${ROLE_HEADINGS[message.role]}`];
	const imageCount = messageImageSources(message.parts).length;
	if (imageCount > 0) {
		lines.push(`_${imageCount} image attachment${imageCount === 1 ? "" : "s"}_`);
	}
	const text = partsText(message.parts).trim();
	if (text) lines.push(text);
	if (isInterrupted(message)) lines.push("_(response interrupted)_");
	return lines.join("\n\n");
}

/**
 * Renders a conversation as a readable markdown transcript: a title heading
 * followed by one section per message. Tool calls, results, and thinking are
 * dropped (they aren't in {@link partsText}); image attachments become a note.
 */
export function conversationToMarkdown(conversation: ExportableConversation): string {
	const heading = `# ${conversation.title ?? "Conversation"}`;
	return [heading, ...conversation.messages.map(messageMarkdown)].join("\n\n");
}

/** The raw `UIMessage[]` blob as pretty-printed JSON: a lossless export. */
export function conversationToJson(conversation: ExportableConversation): string {
	return JSON.stringify(conversation.messages, null, 2);
}

/**
 * A filesystem-safe download name from the conversation title, e.g.
 * `my-chat.md`. Falls back to `conversation` when the title is empty.
 */
export function conversationExportFilename({
	title,
	extension,
}: {
	title: string | null;
	extension: "md" | "json";
}): string {
	const isAlphanumeric = (char: string) =>
		(char >= "a" && char <= "z") || (char >= "0" && char <= "9");
	let dashed = "";
	let lastWasDash = false;
	for (const char of (title ?? "").toLowerCase()) {
		if (isAlphanumeric(char)) {
			dashed += char;
			lastWasDash = false;
		} else if (!lastWasDash) {
			dashed += "-";
			lastWasDash = true;
		}
	}
	let start = 0;
	let end = dashed.length;
	while (start < end && dashed[start] === "-") start++;
	while (end > start && dashed[end - 1] === "-") end--;
	const slug = dashed.slice(start, end).slice(0, 60);
	return `${slug || "conversation"}.${extension}`;
}
