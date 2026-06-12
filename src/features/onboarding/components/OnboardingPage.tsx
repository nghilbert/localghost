import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2Icon } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { FieldLegend, FieldSet } from "#/components/ui/field";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "#/components/ui/item";
import { Progress } from "#/components/ui/progress";
import { ProviderSetupForm } from "#/features/chat/components/ProviderSetupForm";
import { endpointsQueryOptions } from "#/features/chat/lib/chat.functions";
import { OllamaSetupFlow } from "#/features/cookbook/components/OllamaSetupFlow";
import { cookbookStatusQueryOptions } from "#/features/cookbook/lib/cookbook.functions";
import { AppearanceSettings } from "#/features/theme/AppearanceSettings";

const STEPS = [
	{
		id: "appearance",
		title: "Appearance",
		description: "Pick how the app looks. You can change this anytime in Settings → Theme.",
	},
	{
		id: "provider",
		title: "Connect a model provider",
		description:
			"Chat needs at least one LLM endpoint — local Ollama or a hosted API. Keys are encrypted at rest.",
	},
	{
		id: "ollama",
		title: "Run local models (optional)",
		description:
			"Install Ollama to run models on this machine. The recommendation matches your detected hardware.",
	},
] as const;

export function OnboardingPage() {
	const navigate = useNavigate();
	const [stepIndex, setStepIndex] = useState(0);
	const step = STEPS[stepIndex] ?? STEPS[0];
	const isLastStep = stepIndex === STEPS.length - 1;

	return (
		<div className="flex h-full items-start justify-center overflow-auto p-6">
			<Card className="w-full max-w-xl">
				<CardHeader>
					<CardDescription>
						Step {stepIndex + 1} of {STEPS.length}
					</CardDescription>
					<CardTitle>{step.title}</CardTitle>
					<CardDescription>{step.description}</CardDescription>
					<Progress value={((stepIndex + 1) / STEPS.length) * 100} className="mt-2" />
				</CardHeader>
				<CardContent>
					{step.id === "appearance" && <AppearanceSettings />}
					{step.id === "provider" && <ProviderStep />}
					{step.id === "ollama" && <OllamaStep />}
				</CardContent>
				<CardFooter className="justify-between">
					<Button variant="ghost" asChild>
						<Link to="/">Skip for now</Link>
					</Button>
					<div className="flex gap-2">
						<Button
							variant="outline"
							disabled={stepIndex === 0}
							onClick={() => setStepIndex((index) => index - 1)}
						>
							Back
						</Button>
						{isLastStep ? (
							<Button onClick={() => navigate({ to: "/" })}>Finish</Button>
						) : (
							<Button onClick={() => setStepIndex((index) => index + 1)}>Next</Button>
						)}
					</div>
				</CardFooter>
			</Card>
		</div>
	);
}

function ProviderStep() {
	const { data: endpoints = [] } = useQuery(endpointsQueryOptions());

	return (
		<div className="space-y-4">
			{endpoints.length > 0 && (
				<ItemGroup>
					{endpoints.map((endpoint) => (
						<Item key={endpoint.id} variant="outline">
							<ItemContent>
								<ItemTitle>
									{endpoint.name}
									<Badge variant="secondary" className="bg-success/10 text-success">
										Connected
									</Badge>
								</ItemTitle>
								<ItemDescription>{endpoint.url}</ItemDescription>
							</ItemContent>
						</Item>
					))}
				</ItemGroup>
			)}
			<FieldSet>
				<FieldLegend>Add provider</FieldLegend>
				<ProviderSetupForm />
			</FieldSet>
		</div>
	);
}

function OllamaStep() {
	const { data: ollamaStatus } = useQuery({
		...cookbookStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? false : 5_000),
	});

	if (!ollamaStatus) return null;

	if (ollamaStatus.found) {
		return (
			<Alert>
				<CheckCircle2Icon className="text-success" />
				<AlertTitle>Ollama is up</AlertTitle>
				<AlertDescription>
					Reachable at <code className="text-xs">{ollamaStatus.ollamaUrl}</code>. Head to the
					Cookbook to install models for your hardware.
				</AlertDescription>
			</Alert>
		);
	}

	return <OllamaSetupFlow />;
}
