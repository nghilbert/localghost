import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import {
	createPreset,
	deletePreset,
	presetsQueryOptions,
} from "#/features/chat/lib/preset.functions";
import type { createPresetInput } from "#/features/chat/lib/schemas";

export function usePresets() {
	const queryClient = useQueryClient();
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
	const { data: presets = [] } = useQuery(presetsQueryOptions());

	const createPresetMutation = useMutation({
		mutationFn: (data: z.input<typeof createPresetInput>) => createPreset({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Preset saved");
		},
	});

	const deletePresetMutation = useMutation({
		mutationFn: (id: string) => deletePreset({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Preset deleted");
		},
		onError: (error) => toast.error(error.message),
	});

	return {
		presets,
		createPreset: createPresetMutation,
		deletePreset: deletePresetMutation,
	};
}
