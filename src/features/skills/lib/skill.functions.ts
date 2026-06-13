import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";
import { createSkillInput, skillIdInput, updateSkillInput } from "#/features/skills/lib/schemas";
import { prisma } from "#/lib/db.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getSkills = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.skill.findMany({
		where: { ownerId: userId },
		orderBy: { name: "asc" },
	});
});

export const createSkill = createServerFn({ method: "POST" })
	.validator(createSkillInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.skill.create({
			data: {
				name: data.name,
				description: data.description ?? "",
				content: data.content,
				ownerId: userId,
			},
		});
	});

export const updateSkill = createServerFn({ method: "POST" })
	.validator(updateSkillInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.skill.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.skill.update({
			where: { id: data.id },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.description !== undefined ? { description: data.description } : {}),
				...(data.content !== undefined ? { content: data.content } : {}),
			},
		});
	});

export const deleteSkill = createServerFn({ method: "POST" })
	.validator(skillIdInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.skill.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

export const skillsQueryOptions = () =>
	queryOptions({ queryKey: ["skills"], queryFn: () => getSkills() });
