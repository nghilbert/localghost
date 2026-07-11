import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { importBackupResultSchema } from "../-lib/schemas";

/**
 * Uploads a backup file to `/api/backup/import` (a raw API route, so no server
 * fn exists to call) and reports the merge counts the endpoint returns.
 */
export function useImportBackup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (file: File) => {
			const res = await fetch("/api/backup/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: await file.text(),
			});
			if (!res.ok) throw new Error(await res.text());
			return importBackupResultSchema.parse(await res.json()).imported;
		},
		onSuccess: (imported) => {
			queryClient.invalidateQueries({ queryKey: ["conversations"] });
			queryClient.invalidateQueries({ queryKey: ["memories"] });
			queryClient.invalidateQueries({ queryKey: ["user-settings"] });
			const skipped = imported.skippedMemories + imported.skippedConversations;
			const summary = [
				`${imported.memories} memories and ${imported.conversations} conversations added; ${skipped} duplicates skipped.`,
			];
			if (imported.invalidConversations > 0) {
				summary.push(`${imported.invalidConversations} unreadable conversations were ignored.`);
			}
			toast.success("Backup imported", { description: summary.join(" ") });
		},
		onError: (error) => toast.error("Failed to import backup", { description: error.message }),
	});
}
