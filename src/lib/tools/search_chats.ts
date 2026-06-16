import { z } from "zod/v4";
import { prisma } from "#/lib/db.server";

export const searchChatsArgsSchema = z.object({
	query: z.string().optional(),
	limit: z.number().optional(),
});

export async function searchChats(query: string, ownerId: string, limit = 10): Promise<string> {
	if (!query.trim()) return "query is required";

	const results = await prisma.chatMessage.findMany({
		where: {
			session: { ownerId },
			content: { contains: query, mode: "insensitive" },
		},
		orderBy: { createdAt: "desc" },
		take: Math.min(limit, 30),
		include: { session: { select: { id: true, name: true } } },
	});

	if (results.length === 0) return `No messages found matching "${query}".`;

	return results
		.map((m) => {
			const snippet = m.content.slice(0, 150).replace(/\n/g, " ");
			return `[${m.session.name}] (${m.role}): ${snippet}…`;
		})
		.join("\n\n");
}
