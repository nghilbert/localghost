import type { BoundInterrupts, UIMessage } from "@tanstack/ai-client";
import { readUrlToolDef, webSearchToolDef } from "#/features/chat/chat.schemas";
import { deleteMemoryToolDef, manageMemoryToolDef } from "#/features/memory/memory.schemas";

/**
 * Tool definitions without handlers, so `useChat` types each tool call's input and approval
 * requests. The server runs them; a definition without a client handler never runs here.
 */
export const CHAT_TOOLS = [
	webSearchToolDef,
	readUrlToolDef,
	manageMemoryToolDef,
	deleteMemoryToolDef,
] as const;

/** The pending approvals `useChat` reports for {@link CHAT_TOOLS}. */
export type ChatInterrupts = BoundInterrupts<typeof CHAT_TOOLS>;

/** A chat message whose tool calls are typed by {@link CHAT_TOOLS}. */
export type ChatUIMessage = UIMessage<typeof CHAT_TOOLS>;

/** A typed tool call part of a {@link ChatUIMessage}. */
export type ChatToolCall = Extract<ChatUIMessage["parts"][number], { type: "tool-call" }>;

/** A tool result part, matched to its call by `toolCallId`. */
export type ChatToolResult = Extract<ChatUIMessage["parts"][number], { type: "tool-result" }>;
