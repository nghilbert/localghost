import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/features/auth/lib/auth.server";
import {
	createPresetInput,
	deletePresetInput,
	updatePresetInput,
} from "#/features/chat/lib/schemas";
import { prisma } from "#/lib/db.server";

async function getCurrentUserId(): Promise<string> {
	const headers = getRequestHeaders();
	const session = await auth.api.getSession({ headers });
	if (!session) throw new Error("Unauthorized");
	return session.user.id;
}

export const getPresets = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	return prisma.chatPreset.findMany({
		where: { ownerId: userId },
		orderBy: { name: "asc" },
	});
});

export const createPreset = createServerFn({ method: "POST" })
	.validator(createPresetInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		return prisma.chatPreset.create({
			data: {
				name: data.name,
				description: data.description ?? null,
				systemPrompt: data.systemPrompt,
				model: data.model ?? null,
				temperature: data.temperature ?? null,
				mode: data.mode ?? null,
				ownerId: userId,
			},
		});
	});

export const updatePreset = createServerFn({ method: "POST" })
	.validator(updatePresetInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const existing = await prisma.chatPreset.findFirst({ where: { id: data.id, ownerId: userId } });
		if (!existing) throw new Error("Not found");
		return prisma.chatPreset.update({
			where: { id: data.id },
			data: {
				...(data.name !== undefined ? { name: data.name } : {}),
				...(data.description !== undefined ? { description: data.description } : {}),
				...(data.systemPrompt !== undefined ? { systemPrompt: data.systemPrompt } : {}),
				...(data.model !== undefined ? { model: data.model } : {}),
				...(data.temperature !== undefined ? { temperature: data.temperature } : {}),
			},
		});
	});

export const deletePreset = createServerFn({ method: "POST" })
	.validator(deletePresetInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		await prisma.chatPreset.deleteMany({ where: { id: data.id, ownerId: userId } });
	});

export const presetsQueryOptions = () =>
	queryOptions({ queryKey: ["chat-presets"], queryFn: () => getPresets() });
