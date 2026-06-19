import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

type ImportPayload = {
	version?: number;
	userSettings?: { systemPrompt?: string | null; temperature?: number | null } | null;
	memories?: Array<{ text: string; category?: string | null; source?: string }>;
	skills?: Array<{ name: string; description?: string; content: string }>;
	conversations?: Array<{
		title?: string;
		model?: string | null;
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
					skills: 0,
					conversations: 0,
				};

				// Global chat defaults — non-destructively merged: only fill fields the
				// user hasn't already set, so an import never clobbers existing settings.
				if (payload.userSettings) {
					const existing = await prisma.userSettings.findUnique({ where: { ownerId: userId } });
					const systemPrompt = existing?.systemPrompt ?? payload.userSettings.systemPrompt ?? null;
					const temperature = existing?.temperature ?? payload.userSettings.temperature ?? null;
					await prisma.userSettings.upsert({
						where: { ownerId: userId },
						create: { ownerId: userId, systemPrompt, temperature },
						update: { systemPrompt, temperature },
					});
				}

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
