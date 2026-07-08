import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { prisma } from "#/shared/lib/db.server";
import { getCurrentUserId } from "#/shared/lib/session.server";

const updateUserSettingsInput = z.object({
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
});

/** Global chat defaults stored on the user row, falling back to sensible defaults. */
export const getUserSettings = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { systemPrompt: true, temperature: true },
	});
	return {
		systemPrompt: user?.systemPrompt ?? null,
		temperature: user?.temperature ?? 0.7,
	};
});

export const updateUserSettings = createServerFn({ method: "POST" })
	.validator(updateUserSettingsInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const user = await prisma.user.update({
			where: { id: userId },
			data: { systemPrompt: data.systemPrompt ?? null, temperature: data.temperature ?? null },
			select: { systemPrompt: true, temperature: true },
		});
		return {
			systemPrompt: user.systemPrompt,
			temperature: user.temperature ?? 0.7,
		};
	});

export const userSettingsQueryOptions = () =>
	queryOptions({ queryKey: ["user-settings"], queryFn: () => getUserSettings() });
