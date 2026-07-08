import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "#/features/settings/components/SettingsPage";
import { memoriesQueryOptions } from "#/features/settings/lib/memory.functions";
import { settingsSearchSchema } from "#/features/settings/lib/schemas";
import { userSettingsQueryOptions } from "#/features/settings/lib/user-settings.functions";

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
