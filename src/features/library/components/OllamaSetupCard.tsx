import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card";
import { RemoteOllamaForm } from "#/features/library/components/RemoteOllamaForm";

const COMPOSE_INSTRUCTIONS = `# in .env: cpu, nvidia, or amd
COMPOSE_PROFILES=cpu
docker compose up -d`;

/**
 * Shown when no running Ollama instance was found. Purely informational; the
 * parent's status query keeps polling and unmounts this card once one appears.
 */
export function OllamaSetupCard() {
	const [isRemoteFormOpen, setIsRemoteFormOpen] = useState(false);

	if (isRemoteFormOpen) return <RemoteOllamaForm onBack={() => setIsRemoteFormOpen(false)} />;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to Ollama</CardTitle>
				<CardDescription>
					No running Ollama instance was found. This page picks it up automatically as soon as one
					is reachable.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-sm">
					Ollama ships with this app's compose stack — pick the build that matches your hardware and
					restart:
				</p>
				<pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
					{COMPOSE_INSTRUCTIONS}
				</pre>
			</CardContent>
			<CardFooter className="flex-wrap gap-2">
				<Button
					variant="link"
					render={
						<a
							href="https://ollama.com/docs/installation"
							target="_blank"
							rel="noopener noreferrer"
						/>
					}
				>
					<ExternalLinkIcon />
					I'll install it myself
				</Button>
				<Button variant="link" onClick={() => setIsRemoteFormOpen(true)}>
					Connect to a remote or custom URL
				</Button>
			</CardFooter>
		</Card>
	);
}
