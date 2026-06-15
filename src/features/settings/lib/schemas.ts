import { z } from "zod/v4";

export const TAB_VALUES = [
	"account",
	"setup",
	"providers",
	"theme",
	"webhooks",
	"presets",
	"data",
	"mcp",
] as const;

export const SettingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const ProfileFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
});
