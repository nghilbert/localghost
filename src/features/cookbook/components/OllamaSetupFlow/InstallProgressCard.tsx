import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleIcon } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "#/components/ui/item";
import { Spinner } from "#/components/ui/spinner";
import type { InstallPhase, InstallState } from "#/features/cookbook/lib/types";

const STEPS: { phase: InstallPhase; label: string }[] = [
	{ phase: "pulling-image", label: "Downloading the Ollama image" },
	{ phase: "starting", label: "Starting the container" },
	{ phase: "waiting-api", label: "Waiting for Ollama to come online" },
];

const PHASE_ORDER: InstallPhase[] = ["pulling-image", "starting", "waiting-api", "ready"];

type InstallProgressCardProps = {
	installState: InstallState;
	onRetry: () => void;
	onBack: () => void;
};

export function InstallProgressCard({ installState, onRetry, onBack }: InstallProgressCardProps) {
	const queryClient = useQueryClient();
	const isReady = installState.phase === "ready";

	useEffect(() => {
		if (!isReady) return;
		toast.success("Ollama is running");
		queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
		queryClient.invalidateQueries({ queryKey: ["endpoints"] });
	}, [isReady, queryClient]);

	const currentIndex = PHASE_ORDER.indexOf(installState.phase);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Installing Ollama</CardTitle>
				<CardDescription>
					The app is setting up Ollama in the background. This can take a few minutes on the first
					install.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ItemGroup>
					{STEPS.map((step, index) => {
						const isDone = currentIndex > index;
						const isActive = installState.phase === step.phase;
						return (
							<Item key={step.phase}>
								<ItemMedia>
									{isDone ? (
										<CheckCircle2Icon className="text-success" />
									) : isActive ? (
										<Spinner />
									) : (
										<CircleIcon className="text-muted-foreground" />
									)}
								</ItemMedia>
								<ItemContent>
									<ItemTitle className={isActive ? undefined : "text-muted-foreground"}>
										{step.label}
									</ItemTitle>
								</ItemContent>
							</Item>
						);
					})}
				</ItemGroup>

				{installState.phase === "error" && (
					<Alert variant="destructive">
						<AlertTitle>Install failed</AlertTitle>
						<AlertDescription>{installState.error}</AlertDescription>
					</Alert>
				)}
			</CardContent>
			{installState.phase === "error" && (
				<CardFooter className="gap-2">
					<Button onClick={onRetry}>Try again</Button>
					<Button variant="ghost" onClick={onBack}>
						Back
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
