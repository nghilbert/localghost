import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { createWebhook } from "#/features/webhooks/lib/webhook.functions";

const WEBHOOK_EVENT_OPTIONS = ["chat.completed", "session.created", "chat.message"] as const;

type WebhookAddFormProps = {
	onCreated: () => void;
};

export function WebhookAddForm({ onCreated }: WebhookAddFormProps) {
	const queryClient = useQueryClient();
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [secret, setSecret] = useState("");
	const [events, setEvents] = useState<string[]>(["chat.completed"]);
	const [formError, setFormError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createWebhook,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			toast.success("Webhook created");
			onCreated();
		},
		onError: (error) => setFormError(error.message),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>New webhook</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{formError && <p className="text-xs text-destructive">{formError}</p>}
				<Field>
					<FieldLabel htmlFor="webhook-name">Name</FieldLabel>
					<Input
						id="webhook-name"
						placeholder="My webhook"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="webhook-url">URL</FieldLabel>
					<Input
						id="webhook-url"
						placeholder="https://example.com/hook"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="webhook-secret">Signing secret (optional)</FieldLabel>
					<Input
						id="webhook-secret"
						type="password"
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
					/>
				</Field>
				<Field>
					<FieldLabel>Events</FieldLabel>
					<ToggleGroup
						type="multiple"
						value={events}
						onValueChange={setEvents}
						variant="outline"
						size="sm"
					>
						{WEBHOOK_EVENT_OPTIONS.map((event) => (
							<ToggleGroupItem key={event} value={event}>
								{event}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</Field>
				<Button
					size="sm"
					disabled={!name.trim() || !url.trim() || !events.length || createMutation.isPending}
					onClick={() =>
						createMutation.mutate({
							data: { name, url, events, secret: secret || undefined },
						})
					}
				>
					{createMutation.isPending ? "Saving…" : "Create"}
				</Button>
			</CardContent>
		</Card>
	);
}
