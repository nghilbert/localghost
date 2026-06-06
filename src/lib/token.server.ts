import { createHash } from "node:crypto";
import { prisma } from "#/lib/db.server";

const TOKEN_PREFIX = "ody_";

export function hashToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

export async function validateApiToken(raw: string): Promise<{ userId: string } | null> {
	if (!raw.startsWith(TOKEN_PREFIX)) return null;
	const hash = hashToken(raw);
	const token = await prisma.apiToken.findUnique({ where: { tokenHash: hash } });
	if (!token) return null;
	if (token.expiresAt && token.expiresAt < new Date()) return null;
	await prisma.apiToken
		.update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
		.catch(() => {});
	return { userId: token.ownerId };
}
