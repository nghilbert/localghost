import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { downloadUrl } from "#/lib/download";

export function DataTab() {
	const [isImporting, setIsImporting] = useState(false);
	const [importResult, setImportResult] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleExport() {
		downloadUrl("/api/backup/export");
	}

	async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setIsImporting(true);
		setImportResult(null);
		try {
			const text = await file.text();
			const payload = JSON.parse(text) as unknown;
			const res = await fetch("/api/backup/import", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			const data = (await res.json()) as {
				ok?: boolean;
				imported?: Record<string, number>;
				error?: string;
			};
			if (!res.ok || !data.ok) {
				setImportResult(`Import failed: ${data.error ?? res.statusText}`);
			} else {
				const counts = Object.entries(data.imported ?? {})
					.filter(([, v]) => v > 0)
					.map(([k, v]) => `${v} ${k}`)
					.join(", ");
				setImportResult(counts ? `Imported: ${counts}` : "Nothing new to import.");
			}
		} catch (err) {
			setImportResult(`Error: ${(err as Error).message}`);
		} finally {
			setIsImporting(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-1 text-sm font-medium">Export your data</h2>
				<p className="mb-3 text-xs text-muted-foreground">
					Download all your memories, notes, skills, presets, and recent chat sessions as a single
					JSON file.
				</p>
				<Button size="sm" variant="outline" onClick={handleExport}>
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
					disabled={isImporting}
					onClick={() => fileInputRef.current?.click()}
				>
					<UploadIcon size={13} className="mr-1.5" />
					{isImporting ? "Importing…" : "Choose backup file"}
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json,application/json"
					className="sr-only"
					disabled={isImporting}
					onChange={handleImport}
				/>
				{importResult && <p className="mt-2 text-xs text-muted-foreground">{importResult}</p>}
			</section>
		</div>
	);
}
