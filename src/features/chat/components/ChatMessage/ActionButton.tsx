import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { Tooltip } from "#/components/ui/tooltip";

type ActionButtonProps = {
	icon: ReactNode;
	ariaLabel: string;
	tooltip: string;
	onClick: () => void;
};

/** A single icon button in a message footer, tooltipped with its action name. */
export function ActionButton({ icon, ariaLabel, tooltip, onClick }: ActionButtonProps) {
	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				render={
					<Button
						color="neutral"
						variant="quiet"
						size="sm"
						iconOnly
						aria-label={ariaLabel}
						onClick={onClick}
					/>
				}
			>
				{icon}
			</Tooltip.Trigger>
			<Tooltip.Content>{tooltip}</Tooltip.Content>
		</Tooltip.Root>
	);
}
