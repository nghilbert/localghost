import { z } from "zod";

/** How many rows of each kind a backup import added, skipped, or rejected. */
const importBackupCountsSchema = z.object({
	memories: z.number(),
	conversations: z.number(),
	endpoints: z.number(),
	modelSettings: z.number(),
	skippedMemories: z.number(),
	skippedConversations: z.number(),
	skippedEndpoints: z.number(),
	skippedModelSettings: z.number(),
	invalidConversations: z.number(),
});

/** How many rows of each kind a backup import added, skipped, or rejected. */
export type ImportBackupCounts = z.infer<typeof importBackupCountsSchema>;

/** The `POST /api/backup/import` response. */
export const importBackupResultSchema = z.object({
	imported: importBackupCountsSchema,
});
