import { createHash } from "node:crypto";
import { prisma } from "#/lib/db.server";

const TOKEN_PREFIX = "ody_";

/**
 * Hashes a raw API token with SHA-256 for storage and lookup; tokens are never
 * persisted in plaintext.
 *
 * @param raw - The raw token string, including its `ody_` prefix.
 * @returns The hex-encoded SHA-256 digest.
 */
export function hashToken(raw: string): string {
	return createHash("sha256").update(raw).digest("hex");
}

/**
 * Resolves a raw API token to its owning user, refreshing `lastUsedAt` on success.
 *
 * @param raw - The raw token presented by the caller.
 * @returns The owner's user id, or `null` if the token is malformed, unknown, or expired.
 */
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
