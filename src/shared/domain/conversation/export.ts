import type { ModelMessage } from "@tanstack/ai";

/** The conversation fields an export renders; a subset of `ConversationDetail`. */
export interface ExportableConversation {
	title: string | null;
	messages: ModelMessage[];
}

const ROLE_HEADINGS: Record<Exclude<ModelMessage["role"], "tool">, string> = {
	user: "User",
	assistant: "Assistant",
};

/** The text content of a message: the string case, or its text parts joined. */
function messageText(content: ModelMessage["content"]): string {
	if (typeof content === "string") return content;
	if (!content) return "";
	return content.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}

/** How many image parts a message carries. */
function messageImageCount(content: ModelMessage["content"]): number {
	if (!content || typeof content === "string") return 0;
	return content.filter((part) => part.type === "image").length;
}

/** One message as a markdown section: a role heading, image notes, then its text. */
function messageMarkdown(
	message: ModelMessage & { role: Exclude<ModelMessage["role"], "tool"> },
): string {
	const lines: string[] = [`## ${ROLE_HEADINGS[message.role]}`];
	const imageCount = messageImageCount(message.content);
	if (imageCount > 0) {
		lines.push(`_${imageCount} image attachment${imageCount === 1 ? "" : "s"}_`);
	}
	const text = messageText(message.content).trim();
	if (text) lines.push(text);
	return lines.join("\n\n");
}

/**
 * Renders a conversation as a readable markdown transcript: a title heading
 * followed by one section per message. Tool calls and results are dropped
 * (`role: "tool"` messages, and any `toolCalls` on an assistant message);
 * image attachments become a note.
 */
export function conversationToMarkdown(conversation: ExportableConversation): string {
	const heading = `# ${conversation.title ?? "Conversation"}`;
	const rendered = conversation.messages
		.filter(
			(message): message is typeof message & { role: Exclude<ModelMessage["role"], "tool"> } =>
				message.role !== "tool",
		)
		.map(messageMarkdown);
	return [heading, ...rendered].join("\n\n");
}

/** The raw `ModelMessage[]` blob as pretty-printed JSON: a lossless export. */
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
