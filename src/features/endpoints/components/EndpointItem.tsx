import { ChevronDownIcon, SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "#/components/ui/item";
import { EndpointGenerationForm } from "#/features/endpoints/components/EndpointGenerationForm";
import type { getEndpoints } from "#/features/endpoints/lib/endpoint.functions";

type Endpoint = Awaited<ReturnType<typeof getEndpoints>>[number];

/**
 * A configured provider row. Ollama endpoints gain a collapsible panel for
 * per-endpoint generation settings; other providers expose name, URL, and delete.
 */
export function EndpointItem({ endpoint, onDelete }: { endpoint: Endpoint; onDelete: () => void }) {
	const deleteButton = (
		<Button variant="ghost" size="icon-sm" onClick={onDelete} aria-label="Delete provider">
			<Trash2Icon size={14} />
		</Button>
	);

	if (endpoint.provider !== "ollama") {
		return (
			<Item variant="outline">
				<ItemContent>
					<ItemTitle>{endpoint.name}</ItemTitle>
					<ItemDescription>{endpoint.url}</ItemDescription>
				</ItemContent>
				<ItemActions>{deleteButton}</ItemActions>
			</Item>
		);
	}

	return (
		<Collapsible asChild>
			<Item variant="outline" className="flex-col items-stretch">
				<div className="flex items-center gap-2">
					<ItemContent>
						<ItemTitle>{endpoint.name}</ItemTitle>
						<ItemDescription>{endpoint.url}</ItemDescription>
					</ItemContent>
					<ItemActions>
						<CollapsibleTrigger asChild>
							<Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
								<SlidersHorizontalIcon size={14} />
								Generation
								<ChevronDownIcon size={14} />
							</Button>
						</CollapsibleTrigger>
						{deleteButton}
					</ItemActions>
				</div>
				<CollapsibleContent className="pt-3">
					<EndpointGenerationForm endpoint={endpoint} />
				</CollapsibleContent>
			</Item>
		</Collapsible>
	);
}
