import { z } from "zod/v4";
import { modelSelectionSchema } from "#/entities/endpoint/schemas";

const uuid = z.uuid();

export const updateConversationSchema = z.object({
	title: z.string().min(1).optional(),
});

// ── Server-fn inputs ─────────────────────────────────────────────────────────

export const conversationIdInput = z.object({ id: uuid });

/** An image attachment the client already read into a base64 data URL. */
export const imageAttachmentSchema = z.object({
	name: z.string(),
	dataUrl: z.string().startsWith("data:image/"),
});

export const createConversationInput = z
	.object({
		selection: modelSelectionSchema,
		firstMessage: z.string(),
		attachments: z.array(imageAttachmentSchema).optional(),
	})
	.refine((data) => data.firstMessage.trim().length > 0 || (data.attachments?.length ?? 0) > 0, {
		message: "A message or an image attachment is required",
		path: ["firstMessage"],
	});
export const updateConversationInput = z.object({ id: uuid, data: updateConversationSchema });
// `messages` carries UIMessage[], whose interface type can't satisfy a zod record;
// the blob is stored opaquely, so unknown entries are fine here.
export const saveMessagesInput = z.object({ id: uuid, messages: z.array(z.unknown()) });
