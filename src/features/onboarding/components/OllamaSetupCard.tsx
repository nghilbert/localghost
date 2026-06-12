import { CopyIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "#/components/ui/field";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "#/components/ui/input-group";
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import type { GpuInfo } from "#/features/cookbook/lib/types";

type SetupOptionId = "gpu-nvidia" | "gpu-amd" | "cpu" | "native";

type SetupOption = {
	id: SetupOptionId;
	title: string;
	description: string;
	command: string | null;
};

const SETUP_OPTIONS: SetupOption[] = [
	{
		id: "gpu-nvidia",
		title: "NVIDIA GPU (CUDA)",
		description: "GPU-accelerated container. Requires the NVIDIA Container Toolkit on the host.",
		command:
			"docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama",
	},
	{
		id: "gpu-amd",
		title: "AMD GPU (ROCm)",
		description: "GPU-accelerated container using the ROCm image (/dev/kfd, /dev/dri).",
		command:
			"docker run -d --device /dev/kfd --device /dev/dri -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama:rocm",
	},
	{
		id: "cpu",
		title: "CPU only",
		description: "Container that runs anywhere; inference is slower without a GPU.",
		command: "docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama",
	},
	{
		id: "native",
		title: "Native install",
		description: "Install Ollama directly on this machine (recommended on macOS and Windows).",
		command: null,
	},
];

function isSetupOptionId(value: string): value is SetupOptionId {
	return SETUP_OPTIONS.some((option) => option.id === value);
}

function getRecommendedOptionId(gpus: GpuInfo[] | null): SetupOptionId {
	const vendor = gpus?.[0]?.vendor;
	if (vendor === "nvidia") return "gpu-nvidia";
	if (vendor === "amd") return "gpu-amd";
	return "cpu";
}

type OllamaSetupCardProps = {
	gpus: GpuInfo[] | null;
};

export function OllamaSetupCard({ gpus }: OllamaSetupCardProps) {
	const recommendedId = getRecommendedOptionId(gpus);
	const [selectedId, setSelectedId] = useState<SetupOptionId>(recommendedId);
	const selectedCommand = SETUP_OPTIONS.find((option) => option.id === selectedId)?.command ?? null;

	async function handleCopyCommand(command: string) {
		await navigator.clipboard.writeText(command);
		toast.success("Command copied to clipboard");
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Ollama not found</CardTitle>
				<CardDescription>
					No running Ollama instance was detected. Pick how to run it — the recommended option
					matches your detected hardware.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<RadioGroup
					value={selectedId}
					onValueChange={(value) => {
						if (isSetupOptionId(value)) setSelectedId(value);
					}}
				>
					{SETUP_OPTIONS.map((option) => (
						<FieldLabel key={option.id} htmlFor={`ollama-setup-${option.id}`}>
							<Field orientation="horizontal">
								<FieldContent>
									<FieldTitle>
										{option.title}
										{option.id === recommendedId && (
											<Badge className="bg-primary/10 text-primary" variant="secondary">
												Recommended
											</Badge>
										)}
									</FieldTitle>
									<FieldDescription>{option.description}</FieldDescription>
								</FieldContent>
								<RadioGroupItem value={option.id} id={`ollama-setup-${option.id}`} />
							</Field>
						</FieldLabel>
					))}
				</RadioGroup>

				{selectedCommand ? (
					<InputGroup>
						<InputGroupInput
							readOnly
							value={selectedCommand}
							className="font-mono text-xs"
							aria-label="Install command"
						/>
						<InputGroupAddon align="inline-end">
							<InputGroupButton
								size="icon-xs"
								aria-label="Copy command"
								onClick={() => handleCopyCommand(selectedCommand)}
							>
								<CopyIcon />
							</InputGroupButton>
						</InputGroupAddon>
					</InputGroup>
				) : (
					<Button variant="outline" size="sm" asChild>
						<a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer">
							<ExternalLinkIcon />
							Get Ollama from ollama.com
						</a>
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
