import { prisma } from "#/lib/db.server";

/**
 * The admin is the user matching ADMIN_EMAIL when set, otherwise the first
 * registered user.
 */
export async function isAdmin(userId: string): Promise<boolean> {
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
