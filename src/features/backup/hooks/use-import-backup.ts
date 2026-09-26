import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { importBackupResultSchema } from "#/features/backup/backup.schemas";

/** Uploads a backup file to `/api/backup/import` and toasts what was added. */
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
			// A backup touches nearly every feature's data.
			queryClient.invalidateQueries();
			const skipped =
				imported.skippedMemories +
				imported.skippedConversations +
				imported.skippedEndpoints +
				imported.skippedModelSettings;
			const summary = [
				`${imported.memories} memories and ${imported.conversations} conversations added; ${skipped} duplicates skipped.`,
			];
			if (imported.endpoints > 0) {
				summary.push(
					`${imported.endpoints} endpoints added (re-enter their API keys in Settings).`,
				);
			}
			if (imported.modelSettings > 0) {
				summary.push(`${imported.modelSettings} model settings restored.`);
			}
			if (imported.invalidConversations > 0) {
				summary.push(`${imported.invalidConversations} unreadable conversations were ignored.`);
			}
			toast.add({ title: "Backup imported", type: "success", description: summary.join(" ") });
		},
		onError: (error) =>
			toast.add({ title: "Failed to import backup", type: "error", description: error.message }),
	});
}
