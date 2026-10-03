import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
import { modelSelectionSchema } from "#/lib/llm-schemas";

const uuid = z.uuid();

/** The conversation fields a user can change. */
const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
});

/** Identifies a conversation. */
export const conversationIdInput = z.object({ id: uuid });

/** A conversation search query. */
export const searchConversationsInput = z.object({ query: z.string() });

/** An image or document attachment, read into a base64 data URL. */
const composerAttachmentSchema = z.object({
	name: z.string(),
	dataUrl: z.string().startsWith("data:"),
	mimeType: z.string(),
	kind: z.enum(["image", "document"]),
});

/** A new conversation's model and first message. */
export const createConversationInput = z
	.object({
		selection: modelSelectionSchema,
		firstMessage: z.string(),
		attachments: z.array(composerAttachmentSchema).optional(),
	})
	.refine((data) => data.firstMessage.trim().length > 0 || (data.attachments?.length ?? 0) > 0, {
		message: "A message or an attachment is required",
		path: ["firstMessage"],
	});

/** A conversation id and the fields to change. */
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });

/**
 * The chat request's `forwardedProps`: the tools turned on for this message (never saved)
 * and the user's IANA timezone. The conversation comes from the run's `threadId` only.
 */
export const chatStreamForwardedPropsSchema = z.object({
	enabledTools: z.array(z.string()).default([]),
	timeZone: z.string().max(64).optional(),
});

/** A chat thread id, which is its conversation's id. */
export const chatThreadIdSchema = z.uuid();

/** A run id from `chat()`. */
export const chatRunIdSchema = z.string().min(1).max(200);

/** The `web_search` tool's arguments. */
export const webSearchArgsSchema = z.object({
	query: z
		.string()
		.trim()
		.min(1)
		.describe("Short, plain search terms. Supports operators such as site:example.com."),
	time_range: z
		.enum(["day", "month", "year"])
		.optional()
		.catch(undefined)
		.describe("Use only when the user explicitly needs results from the last day, month, or year."),
});

/** The `web_search` tool definition. The server adds its handler. */
export const webSearchToolDef = toolDefinition({
	name: "web_search",
	description:
		"Search the web for external or current information. Add `time_range` only when the user " +
		"explicitly needs results from the last day, month, or year.",
	inputSchema: webSearchArgsSchema,
});

/** The `read_url` tool definition. The server adds its handler. */
export const readUrlToolDef = toolDefinition({
	name: "read_url",
	description:
		"Fetch a web page and return its main content as clean text. " +
		"Use after web_search to read a result in full.",
	inputSchema: z.object({ url: z.string() }),
});
