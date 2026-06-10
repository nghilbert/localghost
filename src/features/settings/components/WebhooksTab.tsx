import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import {
	createWebhook,
	deleteWebhook,
	testWebhook,
	updateWebhook,
	webhooksQueryOptions,
} from "#/features/webhooks/lib/webhook.functions";
import { cn } from "#/lib/utils";

const WEBHOOK_EVENT_OPTIONS = ["chat.completed", "session.created", "chat.message"] as const;

export function WebhooksTab() {
	const queryClient = useQueryClient();
	const { data: webhooks = [] } = useQuery(webhooksQueryOptions());
	const [showForm, setShowForm] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [secret, setSecret] = useState("");
	const [events, setEvents] = useState<string[]>(["chat.completed"]);
	const [formError, setFormError] = useState<string | null>(null);

	const createMutation = useMutation({
		mutationFn: createWebhook,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			setShowForm(false);
			setName("");
			setUrl("");
			setSecret("");
			setEvents(["chat.completed"]);
			setFormError(null);
		},
		onError: (e) => setFormError((e as Error).message),
	});

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
		onSuccess: (r) => {
			queryClient.invalidateQueries({ queryKey: ["webhooks"] });
			toast.success(`Test ping: HTTP ${r.status}`);
		},
		onError: (e) => toast.error(`Test failed: ${(e as Error).message}`),
	});

	function handleToggleEvent(evt: string) {
		setEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]));
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Fire HTTP POST when events happen in your workspace.
				</p>
				<Button size="sm" onClick={() => setShowForm((p) => !p)}>
					{showForm ? "Cancel" : "Add webhook"}
				</Button>
			</div>

			{showForm && (
				<Card>
					<CardHeader>
						<CardTitle>New webhook</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{formError && <p className="text-xs text-destructive">{formError}</p>}
						<Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
						<Input
							placeholder="https://example.com/hook"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
						/>
						<Input
							placeholder="Signing secret (optional)"
							type="password"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
						/>
						<p className="text-xs text-muted-foreground">Events</p>
						<div className="flex flex-wrap gap-2">
							{WEBHOOK_EVENT_OPTIONS.map((evt) => (
								<button
									key={evt}
									type="button"
									onClick={() => handleToggleEvent(evt)}
									className={cn(
										"rounded-full border px-2.5 py-0.5 text-xs",
										events.includes(evt)
											? "border-primary bg-primary/10 text-primary"
											: "border-border text-muted-foreground hover:border-primary/50",
									)}
								>
									{evt}
								</button>
							))}
						</div>
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
			)}

			{webhooks.length === 0 && !showForm && (
				<p className="text-sm text-muted-foreground">No webhooks yet.</p>
			)}

			<div className="space-y-2">
				{webhooks.map((wh) => (
					<Card key={wh.id} size="sm">
						<CardContent className="space-y-1">
							<div className="flex items-center justify-between gap-2">
								<div className="min-w-0">
									<p className="truncate text-sm font-medium">{wh.name}</p>
									<p className="truncate text-xs text-muted-foreground">{wh.url}</p>
								</div>
								<div className="flex shrink-0 items-center gap-1.5">
									<Button
										variant="outline"
										size="sm"
										className="h-7 px-2 text-xs"
										onClick={() => testMutation.mutate({ data: { id: wh.id } })}
										disabled={testMutation.isPending}
									>
										Test
									</Button>
									<button
										type="button"
										onClick={() =>
											toggleMutation.mutate({ data: { id: wh.id, isActive: !wh.isActive } })
										}
										className={cn(
											"rounded px-2 py-0.5 text-xs",
											wh.isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
										)}
									>
										{wh.isActive ? "Active" : "Paused"}
									</button>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6 text-destructive hover:text-destructive"
										onClick={() => deleteMutation.mutate({ data: { id: wh.id } })}
										aria-label="Delete webhook"
									>
										<TrashIcon size={13} />
									</Button>
								</div>
							</div>
							<div className="flex flex-wrap gap-1">
								{wh.events.map((e) => (
									<span
										key={e}
										className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
									>
										{e}
									</span>
								))}
							</div>
							{wh.lastTriggeredAt && (
								<p className="text-[10px] text-muted-foreground">
									Last fired: {new Date(wh.lastTriggeredAt).toLocaleString()} · HTTP{" "}
									{wh.lastStatusCode ?? "?"}
									{wh.lastError && <span className="text-destructive"> · {wh.lastError}</span>}
								</p>
							)}
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
