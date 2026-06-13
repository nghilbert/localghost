import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod/v4";
import type { createWebhookInput } from "#/features/webhooks/lib/schemas";
import { createWebhook } from "#/features/webhooks/lib/webhook.functions";

export function useCreateWebhook() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: z.infer<typeof createWebhookInput>) => createWebhook({ data }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
	});
}
