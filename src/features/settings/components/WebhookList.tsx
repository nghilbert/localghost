import { TrashIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import type { getWebhooks } from "#/features/webhooks/lib/webhook.functions";
import { cn } from "#/lib/utils";

type WebhookListItem = Awaited<ReturnType<typeof getWebhooks>>[number];

type WebhookListProps = {
	webhooks: WebhookListItem[];
	isTesting: boolean;
	onTest: (id: string) => void;
	onToggle: (webhook: WebhookListItem) => void;
	onDelete: (id: string) => void;
};

export function WebhookList({ webhooks, isTesting, onTest, onToggle, onDelete }: WebhookListProps) {
	return (
		<ItemGroup>
			{webhooks.map((webhook) => (
				<Item key={webhook.id} variant="outline" className="flex-col items-start gap-1">
					<div className="flex w-full items-center justify-between gap-2">
						<ItemContent>
							<ItemTitle className="block w-full truncate">{webhook.name}</ItemTitle>
							<ItemDescription className="truncate">{webhook.url}</ItemDescription>
						</ItemContent>
						<ItemActions>
							<Button
								variant="outline"
								size="sm"
								className="h-7 px-2 text-xs"
								onClick={() => onTest(webhook.id)}
								disabled={isTesting}
							>
								Test
							</Button>
							<Button
								variant="ghost"
								size="sm"
								className={cn(
									"h-7 px-2 text-xs",
									webhook.isActive
										? "bg-primary/10 text-primary hover:bg-primary/20"
										: "bg-muted text-muted-foreground",
								)}
								onClick={() => onToggle(webhook)}
							>
								{webhook.isActive ? "Active" : "Paused"}
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-6 w-6 text-destructive hover:text-destructive"
								onClick={() => onDelete(webhook.id)}
								aria-label="Delete webhook"
							>
								<TrashIcon size={13} />
							</Button>
						</ItemActions>
					</div>
					<div className="flex flex-wrap gap-1">
						{webhook.events.map((event) => (
							<Badge key={event} variant="secondary" className="text-[10px] font-normal">
								{event}
							</Badge>
						))}
					</div>
					{webhook.lastTriggeredAt && (
						<p className="text-[10px] text-muted-foreground">
							Last fired: {new Date(webhook.lastTriggeredAt).toLocaleString()} · HTTP{" "}
							{webhook.lastStatusCode ?? "?"}
							{webhook.lastError && (
								<span className="text-destructive"> · {webhook.lastError}</span>
							)}
						</p>
					)}
				</Item>
			))}
		</ItemGroup>
	);
}
