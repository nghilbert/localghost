import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckIcon, ChevronDownIcon, LibraryIcon, LockIcon, TriangleAlertIcon } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import { endpointModelsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import type { ModelSelection } from "#/features/endpoints/lib/types";
import { cn } from "#/lib/utils";

type ModelPickerProps = {
	selection: ModelSelection | null;
	onSelect?: (selection: ModelSelection) => void;
	/** A started conversation is fixed to its model; the picker becomes a read-only label. */
	locked?: boolean;
};

/**
 * Endpoint and model picker. A started conversation is locked to its model, so it
 * renders a read-only label; the draft page renders the interactive dropdown.
 */
export function ModelPicker({ selection, onSelect, locked = false }: ModelPickerProps) {
	if (locked) return <LockedModel selection={selection} />;
	return <ModelDropdown selection={selection} onSelect={onSelect} />;
}

/** Read-only model label for a locked conversation, explaining the lock on hover. */
function LockedModel({ selection }: { selection: ModelSelection | null }) {
	return (
		<Tooltip>
			{/* Disabled elements swallow pointer events, so the span carries the trigger. */}
			<TooltipTrigger asChild>
				<span>
					<Button variant="ghost" size="sm" disabled className="gap-1 truncate opacity-100">
						<LockIcon size={13} className="shrink-0 text-muted-foreground" />
						<span className="truncate">{selection?.model ?? "Model unavailable"}</span>
					</Button>
				</span>
			</TooltipTrigger>
			<TooltipContent>
				{selection
					? "Locked to this chat. Start a new chat to use a different model."
					: "This chat's model is no longer available. Start a new chat."}
			</TooltipContent>
		</Tooltip>
	);
}

function ModelDropdown({ selection, onSelect }: Omit<ModelPickerProps, "locked">) {
	const [open, setOpen] = useState(false);
	const { endpoints } = useEndpoints();
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
	const isError = results.some((result) => result.isError);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("gap-1 truncate", !selection && "text-primary ring-2 ring-primary/40")}
				>
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
				) : isError ? (
					<DropdownMenuGroup>
						<DropdownMenuLabel>Couldn't reach endpoint</DropdownMenuLabel>
						<DropdownMenuItem asChild>
							<Link to="/settings" search={{ tab: "endpoints" }}>
								<TriangleAlertIcon />
								Check provider endpoints
							</Link>
						</DropdownMenuItem>
					</DropdownMenuGroup>
				) : groups.length === 0 ? (
					<DropdownMenuGroup>
						<DropdownMenuLabel>No models yet</DropdownMenuLabel>
						<DropdownMenuItem asChild>
							<Link to="/library" search={{ tab: "browse" }}>
								<LibraryIcon />
								Browse the Library
							</Link>
						</DropdownMenuItem>
					</DropdownMenuGroup>
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
										onClick={() => onSelect?.({ endpointId: endpoint.id, model })}
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
