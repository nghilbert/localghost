import { DownloadIcon, UploadIcon } from "lucide-react";
import { useRef } from "react";
import { useImportBackup } from "#/routes/_authenticated/settings/-hooks/use-import-backup";
import { Button, buttonVariants } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";

export function BackupCard() {
	const importBackup = useImportBackup();
	const fileInput = useRef<HTMLInputElement>(null);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Backup</CardTitle>
				<CardDescription>
					Export your memories, chats, and chat defaults as JSON, or merge a backup file back in.
					Importing skips anything already present.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex gap-2">
				<a
					href="/api/backup/export"
					download
					className={buttonVariants({ variant: "outline", size: "sm" })}
				>
					<DownloadIcon size={13} />
					Export backup
				</a>
				<Button
					variant="outline"
					size="sm"
					disabled={importBackup.isPending}
					onClick={() => fileInput.current?.click()}
				>
					<UploadIcon size={13} />
					{importBackup.isPending ? "Importing…" : "Import backup"}
				</Button>
				<input
					ref={fileInput}
					data-testid="backup-import-input"
					type="file"
					accept="application/json,.json"
					className="sr-only"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file) importBackup.mutate(file);
						// Reset so picking the same file again re-fires change.
						event.target.value = "";
					}}
				/>
			</CardContent>
		</Card>
	);
}
