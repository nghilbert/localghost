import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
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
			toast.success("Model settings saved");
		},
		onError: (error) =>
			toast.error("Failed to save model settings", { description: error.message }),
	});

	const resetMutation = useMutation({
		mutationFn: () => resetModelSetting({ data: { endpointId, model } }),
		onSuccess: () => {
			invalidate();
			toast.success("Model settings reset to defaults");
		},
		onError: (error) =>
			toast.error("Failed to reset model settings", { description: error.message }),
	});

	return { setting, isPending, save: saveMutation, reset: resetMutation };
}
