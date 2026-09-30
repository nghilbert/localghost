import { SquareIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Item } from "#/components/ui/item";
import { Tooltip } from "#/components/ui/tooltip";
import type { PullProgress } from "#/features/library/library.types";
import { DownloadStatus } from "./DownloadStatus";

type DownloadRowProps = {
	model: string;
	/** Shown above the bar; the model id when left out. */
	title?: string;
	pullState: PullProgress;
	size?: "sm" | "md";
	onStop: (model: string) => void;
};

/** A running download: its title, progress, and a button to stop it. */
export function DownloadRow({ model, title, pullState, size, onStop }: DownloadRowProps) {
	return (
		<Item.Root variant="soft" size="sm" className="flex-nowrap">
			<Item.Content>
				<Item.Title className="block max-w-full truncate">{title ?? model}</Item.Title>
				<DownloadStatus pullState={pullState} size={size} />
			</Item.Content>
			<Item.Actions>
				<Tooltip.Root>
					<Tooltip.Trigger
						render={
							<Button
								type="button"
								color="neutral"
								variant="quiet"
								size="sm"
								iconOnly
								className="text-muted-fg hover:text-danger"
								onClick={() => onStop(model)}
								aria-label={`Stop downloading ${model}`}
							/>
						}
					>
						<SquareIcon />
					</Tooltip.Trigger>
					<Tooltip.Content>Stop download</Tooltip.Content>
				</Tooltip.Root>
			</Item.Actions>
		</Item.Root>
	);
}
