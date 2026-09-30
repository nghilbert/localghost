import { createFileRoute } from "@tanstack/react-router";
import { getBackupExport } from "#/features/backup/server/backup.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/backup/export")({
	server: {
		middleware: [authedRequest],
		handlers: {
			GET: ({ context: { userId, userEmail } }) => getBackupExport({ userId, email: userEmail }),
		},
	},
});
