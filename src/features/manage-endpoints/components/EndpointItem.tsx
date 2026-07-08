import { Trash2Icon } from "lucide-react";
import type { listEndpoints } from "#/entities/endpoint/endpoint.functions";
import { Button } from "#/shared/ui/button";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/shared/ui/item";

type Endpoint = Awaited<ReturnType<typeof listEndpoints>>[number];

/** A configured provider endpoint: name, URL, key status, and delete. */
export function EndpointItem({ endpoint, onDelete }: { endpoint: Endpoint; onDelete: () => void }) {
	return (
		<Item variant="outline">
			<ItemContent>
				<ItemTitle>{endpoint.name}</ItemTitle>
				<ItemDescription>{endpoint.url}</ItemDescription>
				<ItemDescription>
					{endpoint.provider} {endpoint.hasApiKey ? "· API key set" : "· No API key"}
				</ItemDescription>
			</ItemContent>
			<ItemActions>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onDelete}
					aria-label="Delete provider endpoint"
				>
					<Trash2Icon size={14} />
				</Button>
			</ItemActions>
		</Item>
	);
}
