import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "#/features/settings/components/SettingsPage";
import { savedMemoriesQueryOptions } from "#/features/settings/lib/memory.functions";
import { SettingsSearchSchema } from "#/features/settings/lib/schemas";
import { userSettingsQueryOptions } from "#/features/settings/lib/user-settings.functions";

export const Route = createFileRoute("/_authenticated/settings")({
	head: () => ({ meta: [{ title: "Settings · localghost" }] }),
	component: SettingsPage,
	validateSearch: (search) => SettingsSearchSchema.parse(search),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(userSettingsQueryOptions()),
			context.queryClient.ensureQueryData(savedMemoriesQueryOptions()),
		]);
	},
});
