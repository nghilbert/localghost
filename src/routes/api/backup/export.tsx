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

				const [memories, notes, skills, conversations] = await Promise.all([
					prisma.memory.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
					prisma.note.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
					prisma.skill.findMany({ where: { ownerId: userId }, orderBy: { name: "asc" } }),
					prisma.conversation.findMany({
						where: { ownerId: userId, archived: false },
						orderBy: { updatedAt: "desc" },
						take: 50,
						select: { title: true, model: true, mode: true, systemPrompt: true, messages: true },
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
					conversations: conversations.map((c) => ({
						title: c.title,
						model: c.model,
						mode: c.mode,
						systemPrompt: c.systemPrompt,
						// The framework's `UIMessage[]` blob, round-tripped verbatim.
						messages: c.messages,
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
