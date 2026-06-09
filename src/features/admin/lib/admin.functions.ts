import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

async function isAdmin(userId: string): Promise<boolean> {
	const adminEmail = process.env.ADMIN_EMAIL;
	if (adminEmail) {
		const user = await prisma.user.findFirst({ where: { id: userId }, select: { email: true } });
		return user?.email === adminEmail;
	}
	const first = await prisma.user.findFirst({
		orderBy: { createdAt: "asc" },
		select: { id: true },
	});
	return first?.id === userId;
}

export const getAdminStats = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");

	if (!(await isAdmin(session.user.id))) throw new Error("Forbidden");

	const [users, sessions, messages, memories, documents, notes, contacts, webhooks] =
		await Promise.all([
			prisma.user.findMany({
				select: {
					id: true,
					name: true,
					email: true,
					createdAt: true,
					_count: { select: { chatSessions: true, memories: true, documents: true } },
				},
				orderBy: { createdAt: "asc" },
			}),
			prisma.chatSession.count(),
			prisma.chatMessage.count(),
			prisma.memory.count(),
			prisma.document.count(),
			prisma.note.count(),
			prisma.contact.count(),
			prisma.webhook.count({ where: { isActive: true } }),
		]);

	return {
		users,
		stats: { sessions, messages, memories, documents, notes, contacts, webhooks },
	};
});

export const adminQueryOptions = () =>
	queryOptions({ queryKey: ["admin"], queryFn: () => getAdminStats() });
