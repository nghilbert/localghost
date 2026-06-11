import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ServerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { FieldLegend, FieldSet } from "#/components/ui/field";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { EndpointForm } from "#/features/chat/components/EndpointForm";
import { deleteEndpoint, endpointsQueryOptions } from "#/features/chat/lib/chat.functions";

export function EndpointDialog() {
	const [open, setOpen] = useState(false);

	const queryClient = useQueryClient();
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEndpoint({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
			toast.success("Provider deleted");
		},
		onError: (error) => toast.error(`Failed to delete provider: ${error.message}`),
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="gap-1.5">
					<ServerIcon size={14} />
					Providers
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Model Providers</DialogTitle>
					<DialogDescription>
						Add LLM provider endpoints. API keys are encrypted at rest.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{endpoints.length > 0 && (
						<ItemGroup>
							{endpoints.map((ep) => (
								<Item key={ep.id} variant="outline">
									<ItemContent>
										<ItemTitle>{ep.name}</ItemTitle>
										<ItemDescription>{ep.url}</ItemDescription>
									</ItemContent>
									<ItemActions>
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => deleteMutation.mutate(ep.id)}
											aria-label="Delete provider"
										>
											<Trash2Icon size={14} />
										</Button>
									</ItemActions>
								</Item>
							))}
						</ItemGroup>
					)}

					<Separator />

					<FieldSet>
						<FieldLegend>Add provider</FieldLegend>
						<EndpointForm />
					</FieldSet>
				</div>
			</DialogContent>
		</Dialog>
	);
}
