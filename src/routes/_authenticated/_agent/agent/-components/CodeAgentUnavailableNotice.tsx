import { TerminalIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "#/shared/components/ui/alert";
import { CODE_AGENT_HARNESSES } from "#/shared/domain/code-agent/harnesses";

/** Shown in place of the session form when no harness CLI is on this server's PATH. */
export function CodeAgentUnavailableNotice() {
	const executables = CODE_AGENT_HARNESSES.map((harness) => harness.executable);

	return (
		<Alert data-testid="code-agent-unavailable">
			<TerminalIcon />
			<AlertTitle>The code agent needs a harness CLI</AlertTitle>
			<AlertDescription>
				No harness CLI (
				{executables.map((name) => (
					<code key={name}>{name}</code>
				))}
				) is on this server's PATH. Under Compose, rebuild the app image to install one; running
				natively, install it yourself.
			</AlertDescription>
		</Alert>
	);
}
