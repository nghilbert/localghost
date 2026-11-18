import { createFileRoute } from "@tanstack/react-router";
import { postBackupImport } from "#/features/backup/server/backup.server";
import { embed } from "#/features/memory/server/embeddings.server";
import { insertMemory } from "#/features/memory/server/memory.server";
import { authedRequest } from "#/lib/middleware";

export const Route = createFileRoute("/api/backup/import")({
	server: {
		middleware: [authedRequest],
		handlers: {
			POST: ({ request, context: { userId } }) =>
				postBackupImport({ request, userId, embed, insertMemory }),
		},
	},
});
