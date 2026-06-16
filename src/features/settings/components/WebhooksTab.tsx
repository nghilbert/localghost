import { useState } from "react";
import { Button } from "#/components/ui/button";
import { AddWebhookForm } from "#/features/settings/components/AddWebhookForm";
import { WebhookList } from "#/features/settings/components/WebhookList";
import { useWebhooks } from "#/features/webhooks/hooks/use-webhooks";

export function WebhooksTab() {
	const { webhooks, updateWebhook, deleteWebhook, testWebhook } = useWebhooks();
	const [showForm, setShowForm] = useState(false);

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

			{showForm && <AddWebhookForm onSuccess={() => setShowForm(false)} />}

			{webhooks.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No webhooks yet.</p>
			)}

			{webhooks.length > 0 && (
				<WebhookList
					webhooks={webhooks}
					isTesting={testWebhook.isPending}
					onTest={(id) => testWebhook.mutate(id)}
					onToggle={(webhook) =>
						updateWebhook.mutate({ id: webhook.id, isActive: !webhook.isActive })
					}
					onDelete={(id) => deleteWebhook.mutate(id)}
				/>
			)}
		</div>
	);
}
