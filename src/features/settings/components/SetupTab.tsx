import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2Icon, CircleAlertIcon, WandSparklesIcon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "#/components/ui/item";
import { Separator } from "#/components/ui/separator";
import { EndpointForm } from "#/features/chat/components/EndpointForm";
import { endpointsQueryOptions } from "#/features/chat/lib/chat.functions";
import { getHardware, getOllamaStatus } from "#/features/cookbook/lib/cookbook.functions";
import { OllamaSetupCard } from "#/features/onboarding/components/OllamaSetupCard";

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
	const { data: ollamaStatus } = useQuery({
		queryKey: ["cookbook-status"],
		queryFn: () => getOllamaStatus(),
	});
	const { data: hardware } = useQuery({
		queryKey: ["cookbook-hardware"],
		queryFn: () => getHardware(),
		staleTime: 60_000,
	});

	return (
		<div className="space-y-6">
			<Button variant="outline" size="sm" asChild>
				<Link to="/onboarding">
					<WandSparklesIcon />
					Run guided setup
				</Link>
			</Button>

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
				<EndpointForm />
			</FieldSet>

			<Separator />

			<FieldSet>
				<FieldLegend className="flex items-center gap-2">
					Ollama (local models)
					<StatusBadge
						isOk={ollamaStatus?.reachable ?? false}
						okLabel="Reachable"
						missingLabel="Not reachable"
					/>
				</FieldLegend>
				<FieldDescription>
					Optional. Powers the Cookbook and local inference without API keys.
				</FieldDescription>
				{ollamaStatus && !ollamaStatus.reachable && (
					<OllamaSetupCard ollamaUrl={ollamaStatus.ollamaUrl} gpus={hardware?.gpus ?? null} />
				)}
			</FieldSet>
		</div>
	);
}
