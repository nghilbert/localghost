import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { z } from "zod/v4";
import type { createWebhookInput, updateWebhookInput } from "#/features/webhooks/lib/schemas";
import {
	createWebhook,
	deleteWebhook,
	testWebhook,
	updateWebhook,
	webhooksQueryOptions,
} from "#/features/webhooks/lib/webhook.functions";

/**
 * Owns the webhooks list plus create/update/delete/test mutations with cache
 * invalidation. Create errors surface inline via the form's `FieldError`; the
 * toggle is silent on success, and `testServer` reports the ping status.
 */
export function useWebhooks() {
	const queryClient = useQueryClient();
	const { data: webhooks = [] } = useQuery(webhooksQueryOptions());
	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["webhooks"] });

	const createMutation = useMutation({
		mutationFn: (data: z.infer<typeof createWebhookInput>) => createWebhook({ data }),
		onSuccess: () => {
			invalidate();
			toast.success("Webhook created");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (data: z.infer<typeof updateWebhookInput>) => updateWebhook({ data }),
		onSuccess: () => invalidate(),
		onError: () => toast.error("Failed to update webhook"),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteWebhook({ data: { id } }),
		onSuccess: () => {
			invalidate();
			toast.success("Webhook deleted");
		},
		onError: () => toast.error("Failed to delete webhook"),
	});

	const testMutation = useMutation({
		mutationFn: (id: string) => testWebhook({ data: { id } }),
		onSuccess: (result) => {
			invalidate();
			toast.success(`Test ping: HTTP ${result.status}`);
		},
		onError: (error) => toast.error(`Test failed: ${error.message}`),
	});

	return {
		webhooks,
		createWebhook: createMutation,
		updateWebhook: updateMutation,
		deleteWebhook: deleteMutation,
		testWebhook: testMutation,
	};
}
