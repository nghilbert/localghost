import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/shared/lib/auth.server";
import { BodyTooLargeError, readJsonWithLimit } from "#/shared/lib/http.server";
import { BACKUP_VERSION, importBackup, importPayloadSchema } from "./-backup.server";

// Generous because backups legitimately embed image attachments as data URLs.
const MAX_IMPORT_BYTES = 256 * 1024 * 1024;

export const Route = createFileRoute("/api/backup/import")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });

				let raw: unknown;
				try {
					raw = await readJsonWithLimit({ request, maxBytes: MAX_IMPORT_BYTES });
				} catch (err) {
					if (err instanceof BodyTooLargeError) return new Response(err.message, { status: 413 });
					return new Response("Invalid JSON", { status: 400 });
				}

				const parsed = importPayloadSchema.safeParse(raw);
				if (!parsed.success) {
					return new Response("Invalid backup format", { status: 400 });
				}
				if ((parsed.data.version ?? BACKUP_VERSION) > BACKUP_VERSION) {
					return new Response(
						`This backup is format version ${parsed.data.version}, newer than this app supports. Update the app, then import again.`,
						{ status: 400 },
					);
				}

				const imported = await importBackup({ userId: session.user.id, payload: parsed.data });
				return Response.json({ ok: true, imported });
			},
		},
	},
});
