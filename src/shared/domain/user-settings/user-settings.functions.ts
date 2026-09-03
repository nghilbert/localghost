import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod/v4";
import { authedFn } from "#/shared/lib/middleware";
import { findUserSettings, saveUserSettings } from "./user-settings.server";

const updateUserSettingsInput = z.object({
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
});

/** Global chat defaults stored on the user row, falling back to sensible defaults. */
export const getUserSettings = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => {
		const settings = await findUserSettings({ ownerId: context.userId });
		return { ...settings, temperature: settings.temperature ?? 0.7 };
	});

export const updateUserSettings = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateUserSettingsInput)
	.handler(async ({ data, context }) => {
		const settings = await saveUserSettings({
			ownerId: context.userId,
			systemPrompt: data.systemPrompt,
			temperature: data.temperature,
		});
		if (!settings) throw new Error("Not found");
		return { ...settings, temperature: settings.temperature ?? 0.7 };
	});

export const userSettingsQueryOptions = () =>
	queryOptions({ queryKey: ["user-settings"], queryFn: () => getUserSettings() });
