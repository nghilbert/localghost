import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

export const Route = createFileRoute("/api/backup/export")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const session = await auth.api.getSession({ headers: request.headers });
				if (!session) return new Response("Unauthorized", { status: 401 });
				const userId = session.user.id;

				const [memories, notes, skills, presets, chatSessions] = await Promise.all([
					prisma.memory.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
					prisma.note.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
					prisma.skill.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" } }),
					prisma.chatPreset.findMany({
						where: { ownerId: userId },
						orderBy: { name: "asc" },
					}),
					prisma.chatSession.findMany({
						where: { ownerId: userId, archived: false },
						include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
						orderBy: { createdAt: "desc" },
						take: 50,
					}),
				]);

				const payload = {
					version: 1,
					exportedAt: new Date().toISOString(),
					exportedBy: session.user.email,
					memories: memories.map((m) => ({
						text: m.text,
						category: m.category,
						source: m.source,
					})),
					notes: notes.map((n) => ({
						title: n.title,
						content: n.content,
						noteType: n.noteType,
						items: n.items,
						color: n.color,
						label: n.label,
						pinned: n.pinned,
					})),
					skills: skills.map((s) => ({
						name: s.name,
						description: s.description,
						content: s.content,
					})),
					presets: presets.map((p) => ({
						name: p.name,
						description: p.description,
						systemPrompt: p.systemPrompt,
						model: p.model,
						temperature: p.temperature,
						mode: p.mode,
					})),
					chatSessions: chatSessions.map((s) => ({
						name: s.name,
						model: s.model,
						mode: s.mode,
						systemPrompt: s.systemPrompt,
						messages: s.messages.map((m) => ({ role: m.role, content: m.content })),
					})),
				};

				const filename = `odysseus-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
