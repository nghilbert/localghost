import { CheckIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "#/shared/components/ui/marker";
import type { CodeAgentApproval } from "#/shared/domain/code-agent/code-agent-approval";

type CommandApprovalMarkerProps = {
	approval: CodeAgentApproval;
	isPending: boolean;
	onApprove: () => void;
	onDeny: () => void;
};

/**
 * The command the agent wants to run, with the choice to allow it. Approving keeps it
 * allowed for the rest of the session; the harness has already refused it this turn,
 * so denying only clears the prompt.
 */
export function CommandApprovalMarker({
	approval,
	isPending,
	onApprove,
	onDeny,
}: CommandApprovalMarkerProps) {
	return (
		<Marker data-testid="command-approval-marker">
			<MarkerIcon>
				<ShieldAlertIcon />
			</MarkerIcon>
			<MarkerContent className="flex flex-wrap items-center gap-2">
				<span>The agent wants to run</span>
				<code className="rounded bg-muted px-1.5 py-0.5 text-xs">{approval.title}</code>
				<Button
					size="xs"
					variant="outline"
					disabled={isPending}
					data-testid="command-approval-approve"
					onClick={onApprove}
				>
					<CheckIcon />
					Allow
				</Button>
				<Button
					size="xs"
					variant="outline"
					disabled={isPending}
					data-testid="command-approval-deny"
					onClick={onDeny}
				>
					<XIcon />
					Deny
				</Button>
			</MarkerContent>
		</Marker>
	);
}
