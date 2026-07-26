import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { toast } from "#/shared/components/ui/toast";
import {
	modelSettingQueryOptions,
	resetModelSetting,
	saveModelSetting,
} from "./model-setting.functions";
import type { perModelOptionsSchema } from "./schemas";

export function useModelSetting({ endpointId, model }: { endpointId: string; model: string }) {
	const queryClient = useQueryClient();
	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["model-setting", endpointId, model] });

	const { data: setting, isPending } = useQuery(modelSettingQueryOptions({ endpointId, model }));

	const saveMutation = useMutation({
		mutationFn: (options: z.infer<typeof perModelOptionsSchema>) =>
			saveModelSetting({ data: { endpointId, model, options } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Model settings saved", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to save model settings",
				type: "error",
				description: error.message,
			}),
	});

	const resetMutation = useMutation({
		mutationFn: () => resetModelSetting({ data: { endpointId, model } }),
		onSuccess: () => {
			invalidate();
			toast.add({ title: "Model settings reset to defaults", type: "success" });
		},
		onError: (error) =>
			toast.add({
				title: "Failed to reset model settings",
				type: "error",
				description: error.message,
			}),
	});

	return { setting, isPending, save: saveMutation, reset: resetMutation };
}
