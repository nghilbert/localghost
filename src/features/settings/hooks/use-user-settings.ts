import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	updateUserSettings,
	userSettingsQueryOptions,
} from "#/features/settings/lib/user-settings.functions";

type UpdateInput = Parameters<typeof updateUserSettings>[0]["data"];

/** Global chat defaults, backed by the query cache. */
export function useUserSettings() {
	const queryClient = useQueryClient();
	const { data: settings } = useSuspenseQuery(userSettingsQueryOptions());

	const update = useMutation({
		mutationFn: (data: UpdateInput) => updateUserSettings({ data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-settings"] });
			toast.success("Chat settings saved");
		},
		onError: () => toast.error("Failed to save chat settings"),
	});

	return { settings, update };
}
