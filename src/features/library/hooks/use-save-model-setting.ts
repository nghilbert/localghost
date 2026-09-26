import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { toast } from "#/components/ui/toast";
import { saveModelSetting } from "#/features/library/library.functions";
import { libraryQueries } from "#/features/library/library.queries";
import type { upsertModelSettingInput } from "#/features/library/library.schemas";

/** Saves a model's sampling overrides. */
export function useSaveModelSetting() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: z.infer<typeof upsertModelSettingInput>) => saveModelSetting({ data }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: libraryQueries.modelSettings.all() });
			toast.add({ title: "Model settings saved", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to save model settings",
				type: "error",
				description: error.message,
			}),
	});
}
