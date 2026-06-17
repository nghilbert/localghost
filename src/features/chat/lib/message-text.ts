import type { UIMessage } from "@tanstack/ai-client";

/**
 * Joins a message's text parts into plain text, excluding tool calls, tool
 * results, and thinking — the human-readable transcript of the message used for
 * export, auto-naming, and text-to-speech.
 *
 * @param parts - A `UIMessage`'s ordered parts (as stored in the `parts` JSONB column).
 * @returns The concatenated text content.
 */
export function partsText(parts: UIMessage["parts"]): string {
	return parts.flatMap((part) => (part.type === "text" ? [part.content] : [])).join("");
}
