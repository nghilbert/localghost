import { useMutation } from "@tanstack/react-query";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import { downloadUrl } from "#/lib/download";

const ImportResult = z.object({
	ok: z.boolean(),
	imported: z.record(z.string(), z.number()),
});

export function DataTab() {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const importBackup = useMutation({
		mutationFn: async (file: File) => {
			const res = await fetch("/api/backup/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: await file.text(),
			});
			if (!res.ok) throw new Error((await res.text()) || res.statusText);
			return ImportResult.parse(await res.json());
		},
		onSuccess: ({ imported }) => {
			const counts = Object.entries(imported)
				.filter(([, count]) => count > 0)
				.map(([key, count]) => `${count} ${key}`)
				.join(", ");
			toast.success(counts ? `Imported: ${counts}` : "Nothing new to import.");
		},
		onError: (error) => toast.error(`Import failed: ${error.message}`),
		onSettled: () => {
			if (fileInputRef.current) fileInputRef.current.value = "";
		},
	});

	function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) importBackup.mutate(file);
	}

	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-1 text-sm font-medium">Export your data</h2>
				<p className="mb-3 text-xs text-muted-foreground">
					Download all your memories, skills, and recent conversations as a single JSON file.
				</p>
				<Button size="sm" variant="outline" onClick={() => downloadUrl("/api/backup/export")}>
					<DownloadIcon size={13} className="mr-1.5" />
					Export backup
				</Button>
			</section>

			<section>
				<h2 className="mb-1 text-sm font-medium">Import from backup</h2>
				<p className="mb-3 text-xs text-muted-foreground">
					Upload a previously exported JSON file. Existing records are kept — imported items are
					added alongside them. Chat sessions are not imported.
				</p>
				<Button
					size="sm"
					variant="outline"
					disabled={importBackup.isPending}
					onClick={() => fileInputRef.current?.click()}
				>
					<UploadIcon size={13} className="mr-1.5" />
					{importBackup.isPending ? "Importing…" : "Choose backup file"}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json,application/json"
					className="sr-only"
					disabled={importBackup.isPending}
					onChange={handleImport}
				/>
			</section>
		</div>
	);
}
