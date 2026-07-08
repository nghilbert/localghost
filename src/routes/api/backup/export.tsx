import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/shared/lib/auth.server";
import { exportBackup } from "./-backup.server";

export const Route = createFileRoute("/api/backup/export")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				const payload = await exportBackup({
					userId: session.user.id,
					email: session.user.email,
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
