import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";

const TOKEN_PREFIX = "ody_";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

function generateToken(): { raw: string; hash: string; prefix: string } {
	const raw = TOKEN_PREFIX + randomBytes(32).toString("base64url");
	const hash = createHash("sha256").update(raw).digest("hex");
	const prefix = raw.slice(0, TOKEN_PREFIX.length + 6);
	return { raw, hash, prefix };
}

export const tokensQueryOptions = () => ({
	queryKey: ["api-tokens"] as const,
	queryFn: () => getTokens(),
});

export const getTokens = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const tokens = await prisma.apiToken.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "desc" },
	});
	return tokens.map((t) => ({
		id: t.id,
		name: t.name,
		prefix: t.prefix,
		scopes: t.scopes,
		lastUsedAt: t.lastUsedAt,
		expiresAt: t.expiresAt,
		createdAt: t.createdAt,
	}));
});

export const createToken = createServerFn({ method: "POST" })
	.validator(
		z.object({
			name: z.string().min(1).max(100),
			expiresInDays: z.number().int().min(1).max(365).optional(),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const { raw, hash, prefix } = generateToken();
		const expiresAt = data.expiresInDays
			? new Date(Date.now() + data.expiresInDays * 86_400_000)
			: null;

		await prisma.apiToken.create({
			data: {
				name: data.name,
				tokenHash: hash,
				prefix,
				expiresAt,
				ownerId: userId,
			},
		});

		return { raw };
	});

export const deleteToken = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.apiToken.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		await prisma.apiToken.delete({ where: { id: data.id } });
	});
