import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Spinner } from "#/components/ui/spinner";
import { useConversationModel } from "#/features/chat/hooks/use-conversation-model";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import { endpointModelsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";

type ModelPickerProps = {
	/** The conversation whose model the picker reads and writes. Omit on /new. */
	conversationId?: string;
};

/** Endpoint and model dropdown. Reads and writes the selection through its owner hook. */
export function ModelPicker({ conversationId }: ModelPickerProps) {
	if (!conversationId) return null;
	return <ModelPickerInner conversationId={conversationId} />;
}

function ModelPickerInner({ conversationId }: { conversationId: string }) {
	const [open, setOpen] = useState(false);
	const { endpoints } = useEndpoints();
	const { selection, setSelection } = useConversationModel(conversationId);
	const label = selection?.model ?? "Select model";

	// Resolve every endpoint's models in one place, fetched only while the menu is
	// open, so emptiness is decided once instead of per endpoint.
	const results = useQueries({
		queries: endpoints.map((endpoint) => ({
			...endpointModelsQueryOptions(endpoint.id),
			enabled: open,
		})),
	});
	const groups = endpoints
		.map((endpoint, i) => ({ endpoint, models: results[i]?.data ?? [] }))
		.filter((group) => group.models.length > 0);
	const isLoading = results.some((result) => result.isLoading);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1 truncate">
					<span className="truncate">{label}</span>
					<ChevronDownIcon size={14} className="shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				{isLoading ? (
					<DropdownMenuItem disabled>
						<Spinner className="size-3" />
						<span className="text-muted-foreground">Loading models…</span>
					</DropdownMenuItem>
				) : groups.length === 0 ? (
					<DropdownMenuItem asChild>
						<Link to="/library">
							<BookOpenIcon />
							No models yet, browse the Library
						</Link>
					</DropdownMenuItem>
				) : (
					groups.map(({ endpoint, models }) => (
						<DropdownMenuGroup key={endpoint.id}>
							<DropdownMenuLabel>{endpoint.name}</DropdownMenuLabel>
							{models.map((model) => {
								const isSelected =
									selection?.endpointId === endpoint.id && selection?.model === model;
								return (
									<DropdownMenuItem
										key={model}
										onClick={() => setSelection({ endpointId: endpoint.id, model })}
									>
										<span className="truncate">{model}</span>
										{isSelected && <CheckIcon size={13} className="ml-auto shrink-0" />}
									</DropdownMenuItem>
								);
							})}
							<DropdownMenuSeparator />
						</DropdownMenuGroup>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
