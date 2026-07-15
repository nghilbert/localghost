import { LockIcon } from "lucide-react";
import type { ModelSelection } from "#/entities/endpoint/types";
import { Button } from "#/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

/** Read-only model label for a locked conversation, explaining the lock on hover. */
export function LockedModelLabel({ selection }: { selection: ModelSelection | null }) {
	const label = selection?.model ?? "Model unavailable";
	const reason = selection
		? "Locked to this chat. Start a new chat to use a different model."
		: "This chat's model is no longer available. Start a new chat.";

	return (
		<Tooltip>
			{/* Disabled elements swallow pointer events, so the span carries the trigger. */}
			<TooltipTrigger render={<span className="cursor-not-allowed" />}>
				<Button variant="ghost" size="sm" disabled className="gap-1 truncate opacity-100">
					<LockIcon size={13} className="shrink-0 text-muted-foreground" />
					<span className="truncate" data-testid="model-picker-locked">
						{label}
					</span>
				</Button>
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}
