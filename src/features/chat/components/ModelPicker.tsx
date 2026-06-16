import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
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
import {
	endpointsQueryOptions,
	getEndpointModels,
	updateSession,
} from "#/features/chat/lib/chat.functions";

type Props = {
	sessionId: string;
	currentModel: string;
	currentEndpointId?: string | null;
};

export function ModelPicker({ sessionId, currentModel, currentEndpointId }: Props) {
	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	async function handleSelect(endpointId: string, model: string) {
		await updateSession({ data: { id: sessionId, data: { endpointId, model } } });
		queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
		queryClient.invalidateQueries({ queryKey: ["sessions"] });
	}

	const label = currentModel || "Select model";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="max-w-50 gap-1 truncate">
					<span className="truncate">{label}</span>
					<ChevronDownIcon size={14} className="shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64">
				{endpoints.length === 0 && (
					<DropdownMenuLabel className="text-muted-foreground">
						No endpoints configured
					</DropdownMenuLabel>
				)}
				{endpoints.map((ep) => (
					<EndpointGroup
						key={ep.id}
						endpoint={ep}
						currentModel={currentModel}
						currentEndpointId={currentEndpointId}
						onSelect={handleSelect}
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
	const { data: models = [], isLoading } = useQuery({
		queryKey: ["endpoint-models", endpoint.id],
		queryFn: () => getEndpointModels({ data: { endpointId: endpoint.id } }),
		staleTime: 30_000,
	});

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
