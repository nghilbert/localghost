import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import { createPreset } from "#/features/chat/lib/preset.functions";
import type { createPresetInput } from "#/features/chat/lib/schemas";

export function useCreatePreset() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.input<typeof createPresetInput>) => createPreset({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat-presets"] }),
	});
}
