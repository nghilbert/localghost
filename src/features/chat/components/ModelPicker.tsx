import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
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
				<Button variant="outline" size="sm" className="max-w-[200px] gap-1 truncate">
					<span className="truncate">{label}</span>
					<ChevronDownIcon size={14} className="shrink-0" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
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
						<span className="text-muted-foreground">Loading models…</span>
					</DropdownMenuItem>
				)}
				{models.map((model) => (
					<DropdownMenuItem
						key={model}
						onClick={() => onSelect(endpoint.id, model)}
						className={
							currentEndpointId === endpoint.id && currentModel === model ? "bg-accent" : ""
						}
					>
						<span className="truncate">{model}</span>
					</DropdownMenuItem>
				))}
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
