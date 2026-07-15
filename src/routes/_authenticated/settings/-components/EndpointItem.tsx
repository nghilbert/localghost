import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { EditEndpointForm } from "#/routes/_authenticated/settings/-components/EditEndpointForm";
import { EndpointHealthBadge } from "#/routes/_authenticated/settings/-components/EndpointHealthBadge";
import { Button } from "#/shared/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemTitle,
} from "#/shared/components/ui/item";
import type { listEndpoints } from "#/shared/domain/endpoint/endpoint.functions";

type Endpoint = Awaited<ReturnType<typeof listEndpoints>>[number];

/** A configured provider endpoint: name, URL, key status, with inline edit and delete. */
export function EndpointItem({ endpoint, onDelete }: { endpoint: Endpoint; onDelete: () => void }) {
	const [editing, setEditing] = useState(false);

	if (editing) {
		return (
			<Item variant="outline">
				<ItemContent>
					<EditEndpointForm endpoint={endpoint} onDone={() => setEditing(false)} />
				</ItemContent>
			</Item>
		);
	}

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
				<EndpointHealthBadge endpointId={endpoint.id} />
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setEditing(true)}
					aria-label="Edit provider endpoint"
				>
					<PencilIcon size={14} />
				</Button>
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
