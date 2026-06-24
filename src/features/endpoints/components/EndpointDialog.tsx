import { ServerIcon } from "lucide-react";
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
import { ItemGroup } from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { EndpointItem } from "#/features/endpoints/components/EndpointItem";
import { ProviderSetupForm } from "#/features/endpoints/components/ProviderSetupForm";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";

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
								<EndpointItem
									key={ep.id}
									endpoint={ep}
									onDelete={() => deleteEndpoint.mutate(ep.id)}
								/>
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
