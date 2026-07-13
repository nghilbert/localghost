import { CircleAlertIcon, DownloadIcon, SquareIcon } from "lucide-react";
import { formatPullDetail } from "#/features/pull-model/lib/format";
import type { PullProgress } from "#/features/pull-model/lib/types";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "#/shared/ui/alert";
import { Button } from "#/shared/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "#/shared/ui/item";
import { Progress } from "#/shared/ui/progress";
import { Spinner } from "#/shared/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/shared/ui/tooltip";

type ModelPullControlsProps = {
	modelId: string;
	pullState: PullProgress | undefined;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
};

/** Renders the available actions and status for one exact model pull target. */
export function ModelPullControls({
	modelId,
	pullState,
	onPull,
	onStop,
	onDismiss,
}: ModelPullControlsProps) {
	if (pullState?.error) {
		return (
			<Alert variant="destructive" data-testid="model-pull-error">
				<CircleAlertIcon />
				<AlertTitle>Pull failed</AlertTitle>
				<AlertDescription title={pullState.error}>{pullState.error}</AlertDescription>
				<AlertAction className="flex gap-1">
					<Button
						type="button"
						variant="outline"
						size="sm"
						data-testid="model-pull-retry"
						onClick={() => onPull(modelId)}
					>
						Retry
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						data-testid="model-pull-dismiss"
						onClick={() => onDismiss(modelId)}
					>
						Dismiss
					</Button>
				</AlertAction>
			</Alert>
		);
	}

	if (pullState) {
		const progress =
			pullState.total && pullState.completed !== undefined
				? Math.round((pullState.completed / pullState.total) * 100)
				: null;
		const detail = formatPullDetail(pullState);

		return (
			<Item variant="muted" size="sm" data-testid="model-pull-progress">
				<ItemMedia variant="icon">
					<Spinner />
				</ItemMedia>
				<ItemContent>
					<ItemTitle>{pullState.status || "Downloading model"}</ItemTitle>
					{detail && <ItemDescription className="tabular-nums">{detail}</ItemDescription>}
					{progress !== null && <Progress value={progress} aria-label="Model download progress" />}
				</ItemContent>
				<ItemActions>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									data-testid="model-pull-stop"
									className="text-muted-foreground hover:text-destructive"
									onClick={() => onStop(modelId)}
									aria-label="Stop pull"
								/>
							}
						>
							<SquareIcon />
						</TooltipTrigger>
						<TooltipContent>Stop pull</TooltipContent>
					</Tooltip>
				</ItemActions>
			</Item>
		);
	}

	return (
		<Button type="button" size="sm" data-testid="model-pull-button" onClick={() => onPull(modelId)}>
			<DownloadIcon data-icon="inline-start" />
			Pull model
		</Button>
	);
}
