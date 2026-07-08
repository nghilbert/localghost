import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/shared/lib/auth.server";
import { importBackup, importPayloadSchema } from "./-backup.server";

export const Route = createFileRoute("/api/backup/import")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				let raw: unknown;
				try {
					raw = await request.json();
				} catch {
					return new Response("Invalid JSON", { status: 400 });
				}

				const parsed = importPayloadSchema.safeParse(raw);
				if (!parsed.success) {
					return new Response("Invalid backup format", { status: 400 });
				}

				const imported = await importBackup({ userId: session.user.id, payload: parsed.data });
				return Response.json({ ok: true, imported });
			},
		},
	},
});
