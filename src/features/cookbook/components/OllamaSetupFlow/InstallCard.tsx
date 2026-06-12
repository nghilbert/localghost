import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleIcon, ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "#/components/ui/field";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "#/components/ui/item";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import { Spinner } from "#/components/ui/spinner";
import {
	type getOllamaInstallInfo,
	installOllama,
} from "#/features/cookbook/lib/install.functions";
import type {
	InstallPhase,
	InstallState,
	OllamaInstallVariant,
} from "#/features/cookbook/lib/types";

type InstallInfo = Awaited<ReturnType<typeof getOllamaInstallInfo>>;

function isInstallVariant(value: string): value is OllamaInstallVariant {
	return value === "cpu" || value === "nvidia" || value === "amd";
}

const NVIDIA_SETUP_COMMANDS = `sudo pacman -S nvidia-container-toolkit   # Arch — see the guide for other distros
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker`;

const INSTALL_STEPS: { phase: InstallPhase; label: string }[] = [
	{ phase: "pulling-image", label: "Downloading the Ollama image" },
	{ phase: "starting", label: "Starting the container" },
	{ phase: "waiting-api", label: "Waiting for Ollama to come online" },
];

const PHASE_ORDER: InstallPhase[] = ["pulling-image", "starting", "waiting-api", "ready"];

/**
 * Installs Ollama as an app-managed docker container: variant picker with a
 * hardware-based recommendation, then live install progress in the same card.
 */
export function InstallCard({
	installInfo,
	onRemote,
}: {
	installInfo: InstallInfo;
	onRemote: () => void;
}) {
	const queryClient = useQueryClient();
	const canUseNvidia = installInfo.isAdmin && installInfo.nvidiaRuntime;
	const recommendedVariant = installInfo.isAdmin ? installInfo.recommendedVariant : "cpu";
	const [selectedVariant, setSelectedVariant] = useState<OllamaInstallVariant>(
		recommendedVariant === "nvidia" && !canUseNvidia ? "cpu" : recommendedVariant,
	);
	const [hasStartedInstall, setHasStartedInstall] = useState(false);

	const installMutation = useMutation({
		mutationFn: (variant: OllamaInstallVariant) => installOllama({ data: { variant } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ollama-install"] }),
		onError: (error) => toast.error("Could not start the install", { description: error.message }),
	});

	function handleInstall() {
		setHasStartedInstall(true);
		installMutation.mutate(selectedVariant);
	}

	const ollamaDownloadLink = (
		<Button variant="link" asChild>
			<a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
				<ExternalLinkIcon />
				I'll install it myself
			</a>
		</Button>
	);

	if (!installInfo.isAdmin) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Set up local models</CardTitle>
					<CardDescription>
						Ollama wasn't found on this machine. Only the admin can install it on this server — ask
						them, or get connected another way below. This page detects Ollama automatically once
						it's running.
					</CardDescription>
				</CardHeader>
				<CardFooter className="flex-wrap gap-2">
					{ollamaDownloadLink}
					<Button variant="link" onClick={onRemote}>
						Ollama runs on another machine
					</Button>
				</CardFooter>
			</Card>
		);
	}

	if (hasStartedInstall) {
		return (
			<InstallProgress
				installState={installInfo.installState}
				onRetry={() => installMutation.mutate(selectedVariant)}
				onBack={() => setHasStartedInstall(false)}
			/>
		);
	}

	const variantOptions: {
		value: OllamaInstallVariant;
		title: string;
		description: string;
		disabled?: boolean;
	}[] = [
		{ value: "cpu", title: "CPU", description: "Runs on the processor — works on any machine." },
		{
			value: "nvidia",
			title: "NVIDIA GPU",
			description: canUseNvidia
				? "GPU-accelerated via CUDA."
				: "Needs the NVIDIA container toolkit on the host — one-time setup below.",
			disabled: !canUseNvidia,
		},
		{
			value: "amd",
			title: "AMD GPU",
			description: "GPU-accelerated via ROCm — requires a supported AMD GPU.",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Set up local models</CardTitle>
				<CardDescription>
					Ollama wasn't found, so let's install it. Pick the build that matches this machine's
					hardware and the app handles the rest — nothing to copy or configure.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<RadioGroup
					value={selectedVariant}
					onValueChange={(value) => {
						if (isInstallVariant(value)) setSelectedVariant(value);
					}}
				>
					{variantOptions.map((option) => (
						<FieldLabel key={option.value} htmlFor={`variant-${option.value}`}>
							<Field orientation="horizontal" data-disabled={option.disabled}>
								<FieldContent>
									<FieldTitle>
										{option.title}
										{recommendedVariant === option.value && !option.disabled && (
											<Badge className="bg-primary/10 text-primary" variant="secondary">
												Recommended
											</Badge>
										)}
									</FieldTitle>
									<FieldDescription>{option.description}</FieldDescription>
								</FieldContent>
								<RadioGroupItem
									value={option.value}
									id={`variant-${option.value}`}
									disabled={option.disabled}
								/>
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>

				{!canUseNvidia && (
					<Alert>
						<AlertTitle>NVIDIA acceleration needs a one-time host setup</AlertTitle>
						<AlertDescription>
							<p>
								Run these on the host to install the NVIDIA container toolkit and register it with
								Docker. Restarting Docker briefly restarts this app too.
							</p>
							<pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
								{NVIDIA_SETUP_COMMANDS}
							</pre>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => queryClient.invalidateQueries({ queryKey: ["ollama-install"] })}
								>
									Check again
								</Button>
								<Button variant="link" size="sm" asChild>
									<a
										href="https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html"
										target="_blank"
										rel="noopener noreferrer"
									>
										Install guide
									</a>
								</Button>
							</div>
						</AlertDescription>
					</Alert>
				)}
			</CardContent>
			<CardFooter className="flex-wrap gap-2">
				<Button onClick={handleInstall} disabled={installMutation.isPending}>
					Install Ollama
				</Button>
				{ollamaDownloadLink}
				<Button variant="link" onClick={onRemote}>
					Ollama runs on another machine
				</Button>
			</CardFooter>
		</Card>
	);
}

function InstallProgress({
	installState,
	onRetry,
	onBack,
}: {
	installState: InstallState;
	onRetry: () => void;
	onBack: () => void;
}) {
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
					{INSTALL_STEPS.map((step, index) => {
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
