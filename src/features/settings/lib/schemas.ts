import { z } from "zod/v4";

export const TAB_VALUES = ["account", "memory", "endpoints", "appearance"] as const;

export type TabValue = (typeof TAB_VALUES)[number];

/** Narrows an arbitrary string to a settings tab id. */
export function isTabValue(value: string): value is TabValue {
	return (TAB_VALUES as readonly string[]).includes(value);
}

export const SettingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const AccountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
});
