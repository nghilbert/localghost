import {
	CircleAlertIcon,
	DownloadIcon,
	Loader2Icon,
	RefreshCwIcon,
	SquareIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { formatBytes, formatBytesPerSec, formatDuration } from "#/features/library/lib/format";
import type { OllamaInstalledModel, PullProgress } from "#/features/library/lib/types";

type ModelActionsCellProps = {
	modelId: string;
	installed: OllamaInstalledModel | null;
	pullState: PullProgress | undefined;
	onStop: (model: string) => void;
	onPull: (model: string) => void;
	/** Clears a failed pull's row. */
	onDismiss: (model: string) => void;
	/** Omit when the cell can never show an installed model. */
	onDelete?: (model: string) => void;
};

export function ModelActionsCell({
	modelId,
	installed,
	pullState,
	onStop,
	onPull,
	onDismiss,
	onDelete,
}: ModelActionsCellProps) {
	if (pullState?.error) {
		return (
			<div className="flex min-w-32 items-center gap-2">
				<div className="flex min-w-0 flex-1 items-center gap-1.5">
					<CircleAlertIcon size={11} className="shrink-0 text-destructive" />
					<span className="truncate text-xs text-destructive" title={pullState.error}>
						{pullState.error}
					</span>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							onClick={() => onPull(modelId)}
							aria-label="Retry pull"
						>
							<RefreshCwIcon size={12} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Retry pull</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							onClick={() => onDismiss(modelId)}
							aria-label="Dismiss error"
						>
							<XIcon size={12} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Dismiss</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	if (pullState) {
		const pct =
			pullState.total && pullState.completed
				? Math.round((pullState.completed / pullState.total) * 100)
				: null;
		const detail = formatPullDetail(pullState);
		return (
			<div className="flex min-w-32 items-center gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center gap-1.5">
						<Loader2Icon size={11} className="animate-spin text-muted-foreground" />
						<span className="truncate text-xs text-muted-foreground">
							{pullState.status ?? "…"}
						</span>
					</div>
					{pct !== null && <Progress value={pct} className="h-1" />}
					{detail && (
						<span className="truncate text-xs text-muted-foreground tabular-nums">{detail}</span>
					)}
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground hover:text-destructive"
							onClick={() => onStop(modelId)}
							aria-label="Stop pull"
						>
							<SquareIcon size={12} />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Stop pull</TooltipContent>
				</Tooltip>
			</div>
		);
	}

	if (installed) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground hover:text-destructive"
						onClick={() => onDelete?.(modelId)}
						aria-label="Delete model"
					>
						<Trash2Icon size={13} />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Delete model</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => onPull(modelId)}>
			<DownloadIcon size={12} />
			Pull
		</Button>
	);
}

/** One-line `<done> / <total> · <rate> · ETA <Xm Xs>`, omitting parts we can't compute yet. */
function formatPullDetail({ completed, total, bytesPerSec }: PullProgress): string | null {
	const parts: string[] = [];
	if (completed !== undefined && total)
		parts.push(`${formatBytes(completed)} / ${formatBytes(total)}`);
	if (bytesPerSec) {
		parts.push(formatBytesPerSec(bytesPerSec));
		if (completed !== undefined && total && bytesPerSec > 0) {
			parts.push(`ETA ${formatDuration((total - completed) / bytesPerSec)}`);
		}
	}
	return parts.length > 0 ? parts.join(" · ") : null;
}
