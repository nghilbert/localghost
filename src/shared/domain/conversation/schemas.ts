import { z } from "zod/v4";
import { modelSelectionSchema } from "#/shared/domain/endpoint/schemas";

const uuid = z.uuid();

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
});

// ── Server-fn inputs ─────────────────────────────────────────────────────────

export const conversationIdInput = z.object({ id: uuid });

/** Free-text query for full-text conversation search. */
export const searchConversationsInput = z.object({ query: z.string() });

/** An attachment the client already read into a base64 data URL, image or document. */
export const composerAttachmentSchema = z.object({
	name: z.string(),
	dataUrl: z.string().startsWith("data:"),
	mimeType: z.string(),
	kind: z.enum(["image", "document"]),
});

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
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });
