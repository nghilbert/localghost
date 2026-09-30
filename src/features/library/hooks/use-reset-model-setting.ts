import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "#/components/ui/toast";
import { resetModelSetting } from "#/features/library/library.functions";
import { libraryQueries } from "#/features/library/library.queries";
import type { ModelSelection } from "#/lib/llm-schemas";

/** Deletes a model's overrides, so the endpoint and user defaults apply. */
export function useResetModelSetting() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: ModelSelection) => resetModelSetting({ data }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: libraryQueries.modelSettings.all() });
			toast.add({ title: "Model settings reset to defaults", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to reset model settings",
				type: "error",
				description: error.message,
			}),
	});
}
