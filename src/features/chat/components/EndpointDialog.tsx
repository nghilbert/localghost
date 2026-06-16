import { ServerIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { ProviderSetupForm } from "#/features/chat/components/ProviderSetupForm";
import { useEndpoints } from "#/features/chat/hooks/use-endpoints";

export function EndpointDialog() {
	const [open, setOpen] = useState(false);
	const { endpoints, deleteEndpoint } = useEndpoints();

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
											onClick={() => deleteEndpoint.mutate(ep.id)}
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
						<ProviderSetupForm />
					</FieldSet>
				</div>
			</DialogContent>
		</Dialog>
	);
}
