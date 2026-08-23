import { LockIcon } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/components/ui/tooltip";
import type { ModelSelection } from "#/shared/domain/endpoint/schemas";

/** Read-only model label for a locked conversation, explaining the lock on hover. */
export function LockedModelLabel({ selection }: { selection: ModelSelection | null }) {
	const label = selection?.model ?? "Model unavailable";
	const reason = selection
		? "Locked to this chat. Start a new chat to use a different model."
		: "This chat's model is no longer available. Start a new chat.";

	return (
		<Tooltip>
			{/* aria-disabled (not disabled) keeps pointer events, so the button is its own
			    tooltip trigger, and avoids tripping InputGroup's has-disabled: styling. */}
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						aria-disabled
						tabIndex={-1}
						className="gap-1 truncate aria-disabled:cursor-not-allowed"
					/>
				}
			>
				<LockIcon size={13} className="shrink-0 text-muted-foreground" />
				<span className="truncate" data-testid="model-picker-locked">
					{label}
				</span>
			</TooltipTrigger>
			<TooltipContent>{reason}</TooltipContent>
		</Tooltip>
	);
}
