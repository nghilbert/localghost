import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

const importPayloadSchema = z.object({
	version: z.number().optional(),
	userSettings: z
		.object({ systemPrompt: z.string().nullish(), temperature: z.number().nullish() })
		.nullish(),
	memories: z
		.array(
			z.object({ text: z.string(), category: z.string().nullish(), source: z.string().optional() }),
		)
		.optional(),
	conversations: z
		.array(
			z.object({
				title: z.string().optional(),
				model: z.string().nullish(),
				messages: z.unknown(),
			}),
		)
		.optional(),
});

export const Route = createFileRoute("/api/backup/import")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

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
				const payload = parsed.data;

				const results = {
					memories: 0,
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
