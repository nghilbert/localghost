import { z } from "zod/v4";

/**
 * Per-kind merge counts a backup import returns. Shared by the server
 * (`importBackup`'s return) and the client (`useImportBackup`) so the wire
 * contract is declared once.
 */
export const importBackupCountsSchema = z.object({
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

export type ImportBackupCounts = z.infer<typeof importBackupCountsSchema>;

/** What `POST /api/backup/import` answers with: the counts under `imported`. */
export const importBackupResultSchema = z.object({
	imported: importBackupCountsSchema,
});
