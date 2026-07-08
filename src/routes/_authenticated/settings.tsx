import { createFileRoute } from "@tanstack/react-router";
import { memoriesQueryOptions } from "#/entities/memory/memory.functions";
import { userSettingsQueryOptions } from "#/entities/user-settings/user-settings.functions";
import { SettingsPage } from "./-page/settings/SettingsPage";
import { settingsSearchSchema } from "./-page/settings/schemas";

export const Route = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [{ title: "Settings · localghost" }] }),
	component: SettingsPage,
	validateSearch: (search) => settingsSearchSchema.parse(search),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(userSettingsQueryOptions()),
			context.queryClient.ensureQueryData(memoriesQueryOptions()),
		]);
	},
});
