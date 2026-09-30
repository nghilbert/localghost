import { createFileRoute } from "@tanstack/react-router";
import { postBackupImport } from "#/features/backup/server/backup.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/backup/import")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: ({ request, context: { userId } }) => postBackupImport({ request, userId }),
		},
	},
});
