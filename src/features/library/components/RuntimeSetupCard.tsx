import { ExternalLinkIcon } from "lucide-react";
import { ButtonLink } from "#/components/ui/button-link";
import { Card } from "#/components/ui/card";
import { LlamacppSettingsLink } from "./LlamacppSettingsLink";

const COMPOSE_INSTRUCTIONS = `# in .env: COMPOSE_PROFILES=dev,llamacpp (or prod,llamacpp)
docker compose up -d`;

/** How to start llama.cpp, shown until one is found. */
export function RuntimeSetupCard() {
	return (
		<Card.Root>
			<Card.Header>
				<Card.Title>Connect to llama.cpp</Card.Title>
				<Card.Description>
					No running llama.cpp instance was found. This page picks it up automatically as soon as
					one is reachable.
				</Card.Description>
			</Card.Header>
			<Card.Content className="space-y-2">
				<p className="text-sm">
					llama.cpp ships with this app's compose stack; enable the profile and restart:
				</p>
				<pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
					{COMPOSE_INSTRUCTIONS}
				</pre>
			</Card.Content>
			<Card.Footer className="flex-wrap gap-2">
				<ButtonLink
					variant="quiet"
					href="https://github.com/ggml-org/llama.cpp/blob/master/docs/install.md"
					target="_blank"
					rel="noopener noreferrer"
				>
					<ExternalLinkIcon />
					I'll install it myself
				</ButtonLink>
				<LlamacppSettingsLink variant="quiet">
					Connect to a remote or custom URL
				</LlamacppSettingsLink>
			</Card.Footer>
		</Card.Root>
	);
}
