import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "#/components/layout/ConfirmDeleteDialog";
import { Button } from "#/components/ui/button";
import { Item } from "#/components/ui/item";
import type { ClientEndpoint } from "#/features/endpoint/endpoint.types";
import { EditEndpointForm } from "./EditEndpointForm";
import { EndpointHealthBadge } from "./EndpointHealthBadge";

/** A saved endpoint's name, URL, and key status, with edit and delete. */
export function EndpointItem({
	endpoint,
	isDeleting,
	onDelete,
}: {
	endpoint: ClientEndpoint;
	isDeleting: boolean;
	onDelete: (onSuccess: () => void) => void;
}) {
	const [editing, setEditing] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	if (editing) {
		return (
			<Item.Root variant="outlined" render={<li />}>
				<Item.Content>
					<EditEndpointForm endpoint={endpoint} onDone={() => setEditing(false)} />
				</Item.Content>
			</Item.Root>
		);
	}

	return (
		<Item.Root variant="outlined" render={<li />}>
			<Item.Content>
				<Item.Title>{endpoint.name}</Item.Title>
				<Item.Description>{endpoint.url}</Item.Description>
				<Item.Description>
					{endpoint.provider} {endpoint.hasApiKey ? "· API key set" : "· No API key"}
				</Item.Description>
			</Item.Content>
			<Item.Actions>
				<EndpointHealthBadge endpointId={endpoint.id} />
				<Button
					color="neutral"
					variant="quiet"
					size="sm"
					iconOnly
					onClick={() => setEditing(true)}
					aria-label="Edit provider endpoint"
				>
					<PencilIcon />
				</Button>
				<Button
					color="neutral"
					variant="quiet"
					size="sm"
					iconOnly
					onClick={() => setDeleteOpen(true)}
					aria-label="Delete provider endpoint"
				>
					<Trash2Icon />
				</Button>
				<ConfirmDeleteDialog
					open={deleteOpen}
					onOpenChange={setDeleteOpen}
					title={`Delete "${endpoint.name}"?`}
					description="Its API key and per-model settings will be permanently deleted, and conversations using it will need a new model. Chat history is kept."
					isPending={isDeleting}
					onConfirm={() => onDelete(() => setDeleteOpen(false))}
				/>
			</Item.Actions>
		</Item.Root>
	);
}
