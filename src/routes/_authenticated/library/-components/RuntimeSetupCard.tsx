import { ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { RemoteRuntimeForm } from "./RemoteRuntimeForm";

const COMPOSE_INSTRUCTIONS = `# in .env: COMPOSE_PROFILES=dev,llamacpp (or prod,llamacpp)
docker compose up -d`;

/**
 * Shown when no running llama.cpp instance was found. Purely informational; the
 * parent's status query keeps polling and unmounts this card once one appears.
 */
export function RuntimeSetupCard() {
	const [isRemoteFormOpen, setIsRemoteFormOpen] = useState(false);

	if (isRemoteFormOpen) return <RemoteRuntimeForm onBack={() => setIsRemoteFormOpen(false)} />;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to llama.cpp</CardTitle>
				<CardDescription>
					No running llama.cpp instance was found. This page picks it up automatically as soon as
					one is reachable.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-sm">
					llama.cpp ships with this app's compose stack; enable the profile and restart:
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
							href="https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md"
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
