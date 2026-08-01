import { createFileRoute } from "@tanstack/react-router";
import { authedRequest } from "#/shared/lib/middleware";
import { exportBackup } from "./-backup.server";

export const Route = createFileRoute("/api/backup/export")({
	server: {
		middleware: [authedRequest],
		handlers: {
			GET: async ({ context }) => {
				const payload = await exportBackup({
					userId: context.userId,
					email: context.userEmail,
				});

				const filename = `localghost-backup-${new Date().toISOString().slice(0, 10)}.json`;
				return new Response(JSON.stringify(payload, null, 2), {
					headers: {
						"Content-Type": "application/json",
						"Content-Disposition": `attachment; filename="${filename}"`,
					},
				});
			},
		},
	},
});
