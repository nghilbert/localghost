import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BookOpenIcon, CheckIcon, ChevronDownIcon } from "lucide-react";
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
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import { endpointModelsQueryOptions } from "#/features/endpoints/lib/endpoint.functions";
import { cn } from "#/lib/utils";

type ModelPickerProps = {
	currentModel: string;
	currentEndpointId?: string | null;
	onSelect: (endpointId: string, model: string) => void;
	/** Ring the trigger to draw the eye when no model is chosen yet. */
	needsAttention?: boolean;
};

/** Endpoint + model dropdown. Presentational: the caller decides what `onSelect` does. */
export function ModelPicker({
	currentModel,
	currentEndpointId,
	onSelect,
	needsAttention,
}: ModelPickerProps) {
	const { endpoints } = useEndpoints();
	const label = currentModel || "Select model";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn("gap-1 truncate", needsAttention && "ring-2 ring-primary ring-offset-1")}
				>
					<span className="truncate">{label}</span>
					<ChevronDownIcon size={14} className="shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				{endpoints.length === 0 && (
					<>
						<DropdownMenuLabel className="text-muted-foreground">No models yet</DropdownMenuLabel>
						<DropdownMenuItem asChild>
							<Link to="/library">
								<BookOpenIcon />
								Browse the Library
							</Link>
						</DropdownMenuItem>
					</>
				)}
				{endpoints.map((ep) => (
					<EndpointGroup
						key={ep.id}
						endpoint={ep}
						currentModel={currentModel}
						currentEndpointId={currentEndpointId}
						onSelect={onSelect}
					/>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type EndpointGroupProps = {
	endpoint: { id: string; name: string };
	currentModel: string;
	currentEndpointId?: string | null;
	onSelect: (endpointId: string, model: string) => void;
};

function EndpointGroup({
	endpoint,
	currentModel,
	currentEndpointId,
	onSelect,
}: EndpointGroupProps) {
	const { data: models = [], isLoading } = useQuery(endpointModelsQueryOptions(endpoint.id));

	return (
		<>
			<DropdownMenuLabel>{endpoint.name}</DropdownMenuLabel>
			<DropdownMenuGroup>
				{isLoading && (
					<DropdownMenuItem disabled>
						<Spinner className="size-3" />
						<span className="text-muted-foreground">Loading models…</span>
					</DropdownMenuItem>
				)}
				{models.map((model) => {
					const isSelected = currentEndpointId === endpoint.id && currentModel === model;
					return (
						<DropdownMenuItem key={model} onClick={() => onSelect(endpoint.id, model)}>
							<span className="truncate">{model}</span>
							{isSelected && <CheckIcon size={13} className="ml-auto shrink-0" />}
						</DropdownMenuItem>
					);
				})}
				{!isLoading && models.length === 0 && (
					<DropdownMenuItem disabled>
						<span className="text-muted-foreground">No models found</span>
					</DropdownMenuItem>
				)}
			</DropdownMenuGroup>
			<DropdownMenuSeparator />
		</>
	);
}
