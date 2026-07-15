import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { getCurrentUserId } from "#/shared/lib/session.server";
import { findUserSettings, saveUserSettings } from "./user-settings.server";

const updateUserSettingsInput = z.object({
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
});

/** Global chat defaults stored on the user row, falling back to sensible defaults. */
export const getUserSettings = createServerFn({ method: "GET" }).handler(async () => {
	const userId = await getCurrentUserId();
	const settings = await findUserSettings({ ownerId: userId });
	return { ...settings, temperature: settings.temperature ?? 0.7 };
});

export const updateUserSettings = createServerFn({ method: "POST" })
	.validator(updateUserSettingsInput)
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const settings = await saveUserSettings({
			ownerId: userId,
			systemPrompt: data.systemPrompt,
			temperature: data.temperature,
		});
		return { ...settings, temperature: settings.temperature ?? 0.7 };
	});

export const userSettingsQueryOptions = () =>
	queryOptions({ queryKey: ["user-settings"], queryFn: () => getUserSettings() });
