import { prisma } from "./db.server";

/**
 * The user holding a live session, when that user is not `email`. Only one person may be
 * signed in at a time, so a result blocks this sign-in.
 */
export async function findOtherSignedInUser({
	email,
}: {
	email: string;
}): Promise<{ name: string } | null> {
	const session = await prisma.session.findFirst({
		where: {
			expiresAt: { gt: new Date() },
			user: { email: { not: email, mode: "insensitive" } },
		},
		select: { user: { select: { name: true } } },
	});
	return session?.user ?? null;
}
