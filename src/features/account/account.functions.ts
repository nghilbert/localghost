import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "#/lib/auth.server";
import { DEFAULT_TEMPERATURE } from "#/lib/llm-constants";
import { authedFn } from "#/lib/middleware";
import { userSettingsInput } from "./account.schemas";
import { findUserSettings, saveUserSettings } from "./server/user.server";

/** The current session, or null when signed out. */
export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});

/** The user's chat defaults, with the default temperature filled in. */
export const getUserSettings = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => {
		const settings = await findUserSettings({ ownerId: context.userId });
		return { ...settings, temperature: settings.temperature ?? DEFAULT_TEMPERATURE };
	});

/** Saves the user's chat defaults. */
export const updateUserSettings = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(userSettingsInput)
	.handler(async ({ data, context }) => {
		const settings = await saveUserSettings({
			ownerId: context.userId,
			systemPrompt: data.systemPrompt,
			temperature: data.temperature,
		});
		return { ...settings, temperature: settings.temperature ?? DEFAULT_TEMPERATURE };
	});
