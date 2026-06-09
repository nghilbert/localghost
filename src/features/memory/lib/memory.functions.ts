import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod/v4";
import { auth } from "#/features/auth/lib/auth.server";
import { prisma } from "#/lib/db.server";
import { embed, toVectorLiteral } from "#/lib/embeddings.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

const CATEGORY_VALUES = ["fact", "preference", "contact", "project", "instruction"] as const;

export const getMemories = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.memory.findMany({
		where: { ownerId: userId },
		orderBy: { createdAt: "desc" },
		select: { id: true, text: true, category: true, source: true, createdAt: true },
	});
});

export const addMemory = createServerFn({ method: "POST" })
	.validator(
		z.object({
			text: z.string().min(1),
			category: z.enum(CATEGORY_VALUES).default("fact"),
		}),
	)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const embedding = await embed(data.text, userId);

		if (embedding) {
			await prisma.$executeRawUnsafe(
				`INSERT INTO memory (id, text, category, source, "ownerId", embedding)
                 VALUES (gen_random_uuid(), $1, $2, 'user', $3, $4::vector)`,
				data.text,
				data.category,
				userId,
				toVectorLiteral(embedding),
			);
			return { ok: true };
		}

		await prisma.memory.create({
			data: { text: data.text, category: data.category, source: "user", ownerId: userId },
		});
		return { ok: true };
	});

export const deleteMemory = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.memory.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

export const searchMemories = createServerFn({ method: "POST" })
	.validator(z.object({ query: z.string().min(1), limit: z.number().default(10) }))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const embedding = await embed(data.query, userId);

		if (embedding) {
			return prisma.$queryRawUnsafe<
				Array<{ id: string; text: string; category: string; score: number }>
			>(
				`SELECT id, text, category, 1 - (embedding <=> $1::vector) AS score
                 FROM memory WHERE "ownerId" = $2 AND embedding IS NOT NULL
                 ORDER BY embedding <=> $1::vector LIMIT $3`,
				toVectorLiteral(embedding),
				userId,
				data.limit,
			);
		}

		return prisma.memory.findMany({
			where: {
				ownerId: userId,
				text: { contains: data.query, mode: "insensitive" },
			},
			take: data.limit,
			select: { id: true, text: true, category: true },
		});
	});

export const memoriesQueryOptions = () =>
	queryOptions({ queryKey: ["memories"], queryFn: () => getMemories() });
