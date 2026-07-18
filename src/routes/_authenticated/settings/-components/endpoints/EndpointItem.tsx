import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { EditEndpointForm } from "#/routes/_authenticated/settings/-components/endpoints/EditEndpointForm";
import { EndpointHealthBadge } from "#/routes/_authenticated/settings/-components/endpoints/EndpointHealthBadge";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/shared/components/ui/alert-dialog";
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
				<AlertDialog>
					<AlertDialogTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Delete provider endpoint"
								data-testid="endpoint-delete-button"
							/>
						}
					>
						<Trash2Icon size={14} />
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete "{endpoint.name}"?</AlertDialogTitle>
							<AlertDialogDescription>
								Its API key and per-model settings will be permanently deleted, and conversations
								using it will need a new model. Chat history is kept.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								data-testid="endpoint-delete-confirm"
								onClick={onDelete}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</ItemActions>
		</Item>
	);
}
