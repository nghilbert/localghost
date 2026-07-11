import { z } from "zod/v4";

export const TAB_VALUES = ["account", "memory", "endpoints", "appearance"] as const;

export type TabValue = (typeof TAB_VALUES)[number];

/** Narrows an arbitrary string to a settings tab id. */
export function isTabValue(value: string): value is TabValue {
	return TAB_VALUES.some((tab) => tab === value);
}

export const settingsSearchSchema = z.object({
	tab: z.enum(TAB_VALUES).optional().catch(undefined),
});

export const accountFormSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	systemPrompt: z.string().max(10000),
});

/** What `POST /api/backup/import` answers with: merge counts per kind. */
export const importBackupResultSchema = z.object({
	imported: z.object({
		memories: z.number(),
		conversations: z.number(),
		skippedMemories: z.number(),
		skippedConversations: z.number(),
	}),
});
