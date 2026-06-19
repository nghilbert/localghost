import { z } from "zod/v4";

export const TAB_VALUES = [
	"account",
	"chat",
	"setup",
	"providers",
	"theme",
	"webhooks",
	"data",
	"mcp",
] as const;

export const SettingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const ProfileFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
});

export const ChatSettingsFormSchema = z.object({
	systemPrompt: z.string().max(10000),
	temperature: z.number().min(0).max(2),
});
