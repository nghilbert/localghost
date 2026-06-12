import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "#/components/ui/radio-group";
import type { SetupPath } from "#/features/cookbook/components/OllamaSetupFlow";
import type { getOllamaInstallInfo } from "#/features/cookbook/lib/install.functions";

type InstallInfo = Awaited<ReturnType<typeof getOllamaInstallInfo>>;

type SetupChoiceCardsProps = {
	installInfo: InstallInfo;
	onChoose: (path: SetupPath) => void;
};

function isSetupPath(value: string): value is SetupPath {
	return value === "install" || value === "manual" || value === "remote";
}

export function SetupChoiceCards({ installInfo, onChoose }: SetupChoiceCardsProps) {
	const canInstall = installInfo.isAdmin && installInfo.dockerAvailable;
	const [selectedPath, setSelectedPath] = useState<SetupPath>(canInstall ? "install" : "manual");

	const installDescription = !installInfo.isAdmin
		? "Only the admin can install Ollama on this server. Ask them, or pick another option."
		: !installInfo.dockerAvailable
			? "Docker isn't available to the server, so it can't install Ollama for you."
			: "The app downloads and starts Ollama in the background — nothing to copy or configure.";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Set up local models</CardTitle>
				<CardDescription>
					Ollama wasn't found on this machine. Pick how you'd like to get it running.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<RadioGroup
					value={selectedPath}
					onValueChange={(value) => {
						if (isSetupPath(value)) setSelectedPath(value);
					}}
				>
					<FieldLabel htmlFor="setup-path-install">
						<Field orientation="horizontal" data-disabled={!canInstall}>
							<FieldContent>
								<FieldTitle>
									Install Ollama for me
									{canInstall && (
										<Badge className="bg-primary/10 text-primary" variant="secondary">
											Recommended
										</Badge>
									)}
								</FieldTitle>
								<FieldDescription>{installDescription}</FieldDescription>
							</FieldContent>
							<RadioGroupItem value="install" id="setup-path-install" disabled={!canInstall} />
						</Field>
					</FieldLabel>
					<FieldLabel htmlFor="setup-path-manual">
						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>I'll install it myself</FieldTitle>
								<FieldDescription>
									Download Ollama from ollama.com — the app detects it automatically once it's
									running.
								</FieldDescription>
							</FieldContent>
							<RadioGroupItem value="manual" id="setup-path-manual" />
						</Field>
					</FieldLabel>
					<FieldLabel htmlFor="setup-path-remote">
						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>Ollama runs on another machine</FieldTitle>
								<FieldDescription>
									Connect to an instance on your network, like a homelab server.
								</FieldDescription>
							</FieldContent>
							<RadioGroupItem value="remote" id="setup-path-remote" />
						</Field>
					</FieldLabel>
				</RadioGroup>
			</CardContent>
			<CardFooter>
				<Button onClick={() => onChoose(selectedPath)}>Continue</Button>
			</CardFooter>
		</Card>
	);
}
