import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { auth, isSignUpOpen } from "#/lib/auth.server";
import { authedFn } from "#/lib/middleware";
import { findUserSettings, saveUserSettings } from "./server/user.server";

/** The current session, or null when signed out. */
export const getAuthSession = createServerFn({ method: "GET" }).handler(async () => {
	const headers = getRequestHeaders();
	return await auth.api.getSession({ headers });
});

/** Whether sign-up is open. Needs no session, since the visitors asking have none yet. */
export const getSignUpAvailability = createServerFn({ method: "GET" }).handler(async () => ({
	open: await isSignUpOpen(),
}));

const updateUserSettingsInput = z.object({
	systemPrompt: z.string().nullish(),
	temperature: z.number().min(0).max(2).nullish(),
});

/** The user's chat defaults, with temperature defaulting to 0.7. */
export const getUserSettings = createServerFn({ method: "GET" })
	.middleware([authedFn])
	.handler(async ({ context }) => {
		const settings = await findUserSettings({ ownerId: context.userId });
		return { ...settings, temperature: settings.temperature ?? 0.7 };
	});

/** Saves the user's chat defaults. */
export const updateUserSettings = createServerFn({ method: "POST" })
	.middleware([authedFn])
	.validator(updateUserSettingsInput)
	.handler(async ({ data, context }) => {
		const settings = await saveUserSettings({
			ownerId: context.userId,
			systemPrompt: data.systemPrompt,
			temperature: data.temperature,
		});
		return { ...settings, temperature: settings.temperature ?? 0.7 };
	});
