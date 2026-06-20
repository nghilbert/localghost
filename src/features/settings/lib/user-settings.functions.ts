import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/features/auth/lib/session.server";
import { prisma } from "#/lib/db.server";

const updateUserSettingsInput = z.object({
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
});

/** Global chat defaults for the current user, falling back to sensible defaults. */
export const getUserSettings = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const settings = await prisma.userSettings.findUnique({ where: { ownerId: userId } });
	return {
		systemPrompt: settings?.systemPrompt ?? null,
		temperature: settings?.temperature ?? 0.7,
	};
});

export const updateUserSettings = createServerFn({ method: "POST" })
	.validator(updateUserSettingsInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const systemPrompt = data.systemPrompt ?? null;
		const temperature = data.temperature ?? null;
		const settings = await prisma.userSettings.upsert({
			where: { ownerId: userId },
			create: { ownerId: userId, systemPrompt, temperature },
			update: { systemPrompt, temperature },
		});
		return {
			systemPrompt: settings.systemPrompt,
			temperature: settings.temperature ?? 0.7,
		};
	});

export const userSettingsQueryOptions = () =>
	queryOptions({ queryKey: ["user-settings"], queryFn: () => getUserSettings() });
