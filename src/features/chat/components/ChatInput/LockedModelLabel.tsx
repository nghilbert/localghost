import { LockIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Tooltip } from "#/components/ui/tooltip";
import type { ModelSelection } from "#/lib/llm-schemas";

/** The model of a started conversation, which cannot change, with a tooltip saying why. */
export function LockedModelLabel({ selection }: { selection: ModelSelection | null }) {
	const label = selection?.model ?? "Model unavailable";
	const reason = selection
		? "Locked to this chat. Start a new chat to use a different model."
		: "This chat's model is no longer available. Start a new chat.";

	return (
		<Tooltip.Root>
			{/* aria-disabled keeps the tooltip working and the input group from greying out. */}
			<Tooltip.Trigger
				render={
					<Button
						color="neutral"
						variant="quiet"
						size="sm"
						aria-disabled
						tabIndex={-1}
						className="gap-1 truncate aria-disabled:cursor-not-allowed"
					/>
				}
			>
				<LockIcon className="size-3.5 shrink-0 text-muted-fg" />
				<span className="truncate">{label}</span>
			</Tooltip.Trigger>
			<Tooltip.Content>{reason}</Tooltip.Content>
		</Tooltip.Root>
	);
}
