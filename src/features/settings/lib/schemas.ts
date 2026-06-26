import { z } from "zod/v4";

export const TAB_VALUES = ["account", "memory", "providers", "appearance"] as const;

export const SettingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const AccountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
});
