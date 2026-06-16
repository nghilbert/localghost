import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "#/components/ui/item";
import { ProviderSetupForm } from "#/features/chat/components/ProviderSetupForm";
import { endpointsQueryOptions } from "#/features/chat/lib/chat.functions";

function StatusBadge({
	isOk,
	okLabel,
	missingLabel,
}: {
	isOk: boolean;
	okLabel: string;
	missingLabel: string;
}) {
	return isOk ? (
		<Badge variant="secondary" className="bg-success/10 text-success">
			<CheckCircle2Icon />
			{okLabel}
		</Badge>
	) : (
		<Badge variant="secondary" className="bg-warning/10 text-warning">
			<CircleAlertIcon />
			{missingLabel}
		</Badge>
	);
}

export function SetupTab() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	return (
		<div className="space-y-6">
			<FieldSet>
				<FieldLegend className="flex items-center gap-2">
					LLM providers
					<StatusBadge
						isOk={endpoints.length > 0}
						okLabel={`${endpoints.length} configured`}
						missingLabel="None configured"
					/>
				</FieldLegend>
				<FieldDescription>
					Required for chat. Local Ollama or any hosted API; keys are encrypted at rest.
				</FieldDescription>
				{endpoints.length > 0 && (
					<ItemGroup>
						{endpoints.map((endpoint) => (
							<Item key={endpoint.id} variant="outline">
								<ItemContent>
									<ItemTitle>{endpoint.name}</ItemTitle>
									<ItemDescription>{endpoint.url}</ItemDescription>
								</ItemContent>
							</Item>
						))}
					</ItemGroup>
				)}
				<ProviderSetupForm />
			</FieldSet>
		</div>
	);
}
