import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { WebhookAddForm } from "#/features/settings/components/WebhookAddForm";
import { WebhookList } from "#/features/settings/components/WebhookList";
import {
	deleteWebhook,
	testWebhook,
	updateWebhook,
	webhooksQueryOptions,
} from "#/features/webhooks/lib/webhook.functions";

export function WebhooksTab() {
	const queryClient = useQueryClient();
	const { data: webhooks = [] } = useQuery(webhooksQueryOptions());
	const [showForm, setShowForm] = useState(false);

	const toggleMutation = useMutation({
		mutationFn: updateWebhook,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteWebhook,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["webhooks"] }),
	});

	const testMutation = useMutation({
		mutationFn: testWebhook,
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			toast.success(`Test ping: HTTP ${result.status}`);
		},
		onError: (error) => toast.error(`Test failed: ${error.message}`),
	});

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Fire HTTP POST when events happen in your workspace.
				</p>
				<Button size="sm" onClick={() => setShowForm((isShown) => !isShown)}>
					{showForm ? "Cancel" : "Add webhook"}
				</Button>
			</div>

			{showForm && <WebhookAddForm onCreated={() => setShowForm(false)} />}

			{webhooks.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No webhooks yet.</p>
			)}

			{webhooks.length > 0 && (
				<WebhookList
					webhooks={webhooks}
					isTesting={testMutation.isPending}
					onTest={(id) => testMutation.mutate({ data: { id } })}
					onToggle={(webhook) =>
						toggleMutation.mutate({ data: { id: webhook.id, isActive: !webhook.isActive } })
					}
					onDelete={(id) => deleteMutation.mutate({ data: { id } })}
				/>
			)}
		</div>
	);
}
