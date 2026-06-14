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
	presets?: Array<{
		name: string;
		description?: string | null;
		systemPrompt: string;
		model?: string | null;
		temperature?: number | null;
		mode?: string | null;
	}>;
	// chatSessions intentionally skipped on import — too complex to deduplicate
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
					presets: 0,
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

				if (Array.isArray(payload.presets)) {
					for (const p of payload.presets) {
						if (!p?.name || !p?.systemPrompt) continue;
						await prisma.chatPreset.create({
							data: {
								name: p.name,
								description: p.description ?? null,
								systemPrompt: p.systemPrompt,
								model: p.model ?? null,
								temperature: p.temperature ?? null,
								mode: p.mode ?? null,
								ownerId: userId,
							},
						});
						results.presets++;
					}
				}

				return Response.json({ ok: true, imported: results });
			},
		},
	},
});
