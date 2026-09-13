import { CheckIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Marker, MarkerContent, MarkerIcon } from "#/shared/components/ui/marker";
import { approvalCommandTarget, type CodeAgentApproval } from "#/shared/domain/code-agent/approval";

type CommandApprovalMarkerProps = {
	approval: CodeAgentApproval;
	/** True while the harness is streaming a turn: approving re-runs the turn, and a second
	 * run before the first finishes shares the sandbox and clobbers its transcript. */
	disabled: boolean;
	onApprove: () => void;
	onDeny: () => void;
};

/**
 * The command the agent wants to run, with the choice to allow it. Approving allows it for
 * the re-run only, so the same command asks again next turn; the harness has already
 * refused it this turn, so denying only clears the prompt.
 */
export function CommandApprovalMarker({
	approval,
	disabled,
	onApprove,
	onDeny,
}: CommandApprovalMarkerProps) {
	// Only a `command`-kind id (and one whose target isn't itself a glob) has a grant path
	// in `buildCodeAgentPolicy`; an "Allow" for anything else would silently do nothing.
	const grantable = approvalCommandTarget(approval.approvalId) !== null;
	return (
		<Marker data-testid="command-approval-marker">
			<MarkerIcon>
				<ShieldAlertIcon />
			</MarkerIcon>
			<MarkerContent className="flex flex-wrap items-center gap-2">
				<span>The agent wants to run</span>
				<code className="rounded bg-muted px-1.5 py-0.5 text-xs">{approval.title}</code>
				{grantable ? (
					<Button
						size="xs"
						variant="outline"
						disabled={disabled}
						data-testid="command-approval-approve"
						onClick={onApprove}
					>
						<CheckIcon />
						Allow
					</Button>
				) : (
					<span className="text-muted-foreground text-xs">Can't be allowed from here</span>
				)}
				<Button
					size="xs"
					variant="outline"
					disabled={disabled}
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
