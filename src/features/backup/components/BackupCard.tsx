import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef } from "react";
import { Button } from "#/components/ui/button";
import { ButtonLink } from "#/components/ui/button-link";
import { Card } from "#/components/ui/card";
import { useImportBackup } from "#/features/backup/hooks/use-import-backup";

/** Exports and imports a backup file. */
export function BackupCard() {
	const importBackup = useImportBackup();
	const fileInput = useRef<HTMLInputElement>(null);

	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Backup</Card.Title>
				<Card.Description>
					Export your memories, chats, and chat defaults as JSON, or merge a backup file back in.
					Importing skips anything already present.
				</Card.Description>
			</Card.Header>
			<Card.Content className="flex gap-2">
				<ButtonLink color="neutral" variant="outlined" size="sm" href="/api/backup/export" download>
					<DownloadIcon />
					Export backup
				</ButtonLink>
				<Button
					color="neutral"
					variant="outlined"
					size="sm"
					disabled={importBackup.isPending}
					onClick={() => fileInput.current?.click()}
				>
					<UploadIcon />
					{importBackup.isPending ? "Importing..." : "Import backup"}
				</Button>
				<input
					ref={fileInput}
					aria-label="Backup file"
					type="file"
					accept="application/json,.json"
					className="sr-only"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) importBackup.mutate(file);
						// Cleared so picking the same file again fires `onChange`.
						event.target.value = "";
					}}
				/>
			</Card.Content>
		</Card.Root>
	);
}
