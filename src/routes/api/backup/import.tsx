import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

type ImportPayload = {
	version?: number;
	memories?: Array<{ text: string; category?: string | null; source?: string }>;
	notes?: Array<{
		title?: string;
		content?: string | null;
		noteType?: string;
		items?: unknown;
		color?: string | null;
		label?: string | null;
		pinned?: boolean;
	}>;
	skills?: Array<{ name: string; description?: string; content: string }>;
	conversations?: Array<{
		title?: string;
		model?: string | null;
		mode?: string | null;
		systemPrompt?: string | null;
		messages?: unknown;
	}>;
};

export const Route = createFileRoute("/api/backup/import")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				let payload: ImportPayload;
				try {
					payload = (await request.json()) as ImportPayload;
				} catch {
					return new Response("Invalid JSON", { status: 400 });
				}

				if (!payload || typeof payload !== "object") {
					return new Response("Invalid backup format", { status: 400 });
				}

				const results = {
					memories: 0,
					notes: 0,
					skills: 0,
					conversations: 0,
				};

				if (Array.isArray(payload.memories)) {
					for (const m of payload.memories) {
						if (!m?.text) continue;
						await prisma.memory.create({
							data: {
								text: m.text,
								category: m.category ?? "fact",
								source: m.source ?? "import",
								ownerId: userId,
							},
						});
						results.memories++;
					}
				}

				if (Array.isArray(payload.notes)) {
					for (const n of payload.notes) {
						if (!n?.title && !n?.content) continue;
						await prisma.note.create({
							data: {
								title: n.title ?? "Imported note",
								content: n.content ?? null,
								noteType: n.noteType ?? "note",
								items: n.items ?? [],
								color: n.color ?? null,
								label: n.label ?? null,
								pinned: n.pinned ?? false,
								ownerId: userId,
							},
						});
						results.notes++;
					}
				}

				if (Array.isArray(payload.skills)) {
					for (const s of payload.skills) {
						if (!s?.name || !s?.content) continue;
						await prisma.skill.create({
							data: {
								name: s.name,
								description: s.description ?? "",
								content: s.content,
								ownerId: userId,
							},
						});
						results.skills++;
					}
				}

				if (Array.isArray(payload.conversations)) {
					for (const c of payload.conversations) {
						// Round-trip to a clean JSON blob for the `messages` JSONB column. The
						// endpoint is not restored (ids are account-specific), so the imported
						// conversation reconnects to a model once the user picks one.
						const messages = JSON.parse(JSON.stringify(c.messages ?? []));
						await prisma.conversation.create({
							data: {
								title: c.title ?? "Imported chat",
								model: c.model ?? "",
								mode: c.mode ?? "chat",
								systemPrompt: c.systemPrompt ?? null,
								messages,
								ownerId: userId,
							},
						});
						results.conversations++;
					}
				}

				return Response.json({ ok: true, imported: results });
			},
		},
	},
});
