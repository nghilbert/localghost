import { z } from "zod/v4";

export const WEBHOOK_EVENT_VALUES = ["chat.completed", "session.created", "chat.message"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENT_VALUES)[number];

export const WEBHOOK_EVENT_OPTIONS = WEBHOOK_EVENT_VALUES.map((value) => ({ value, label: value }));

export const AddWebhookFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
	url: z.url("Must be a valid URL").max(2048),
	secret: z.string(),
	events: z.array(z.enum(WEBHOOK_EVENT_VALUES)).min(1, "Pick at least one event"),
});

export const addWebhookDefaults: z.infer<typeof AddWebhookFormSchema> = {
	name: "",
	url: "",
	secret: "",
	events: ["chat.completed"],
};

export const createWebhookInput = z.object({
	name: z.string().min(1),
	url: z.url(),
	events: z.array(z.enum(WEBHOOK_EVENT_VALUES)).min(1),
	secret: z.string().optional(),
});

export const toCreateWebhookInput = (
	value: z.infer<typeof AddWebhookFormSchema>,
): z.infer<typeof createWebhookInput> => ({
	name: value.name.trim(),
	url: value.url.trim(),
	events: value.events,
	secret: value.secret || undefined,
});

export const updateWebhookInput = z.object({
	id: z.uuid(),
	isActive: z.boolean().optional(),
	name: z.string().min(1).optional(),
});

export const webhookIdInput = z.object({ id: z.uuid() });
