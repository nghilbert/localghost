import type { ReactNode } from "react";
import { Button } from "#/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

type MessageActionButtonProps = {
	icon: ReactNode;
	ariaLabel: string;
	tooltip: string;
	testId: string;
	onClick: () => void;
};

/** A single icon button in a message footer, tooltipped with its action name. */
export function MessageActionButton({
	icon,
	ariaLabel,
	tooltip,
	testId,
	onClick,
}: MessageActionButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={ariaLabel}
						data-testid={testId}
						onClick={onClick}
					/>
				}
			>
				{icon}
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
