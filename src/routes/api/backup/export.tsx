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

				const [memories, conversations, userSettings] = await Promise.all([
					prisma.memory.findMany({ where: { ownerId: userId }, orderBy: { id: "asc" } }),
					prisma.conversation.findMany({
						where: { ownerId: userId, archived: false },
						orderBy: { updatedAt: "desc" },
						take: 50,
						select: { title: true, model: true, messages: true },
					}),
					prisma.userSettings.findUnique({ where: { ownerId: userId } }),
				]);

				const payload = {
					version: 2,
					exportedAt: new Date().toISOString(),
					exportedBy: session.user.email,
					userSettings: userSettings
						? { systemPrompt: userSettings.systemPrompt, temperature: userSettings.temperature }
						: null,
					memories: memories.map((m) => ({
						text: m.text,
						category: m.category,
						source: m.source,
					})),
					conversations: conversations.map((c) => ({
						title: c.title,
						model: c.model,
						// The framework's `UIMessage[]` blob, round-tripped verbatim.
						messages: c.messages,
					})),
				};

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
