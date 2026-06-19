import { DownloadIcon, Loader2Icon, SquareIcon, Trash2Icon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Progress } from "#/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { OllamaInstalledModel, PullProgress } from "#/features/library/lib/types";

type ModelActionsCellProps = {
	modelId: string;
	installed: OllamaInstalledModel | null;
	pullState: PullProgress | undefined;
	onStop: (model: string) => void;
	/** Omit when the cell can never show a not-yet-installed model (My Models). */
	onPull?: (model: string) => void;
	/** Omit when the cell can never show an installed model. */
	onDelete?: (model: string) => void;
};

export function ModelActionsCell({
	modelId,
	installed,
	pullState,
	onStop,
	onPull,
	onDelete,
}: ModelActionsCellProps) {
	if (pullState) {
		const pct =
			pullState.total && pullState.completed
				? Math.round((pullState.completed / pullState.total) * 100)
				: null;
		return (
			<div className="flex min-w-32 items-center gap-2">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center gap-1.5">
						<Loader2Icon size={11} className="animate-spin text-muted-foreground" />
						<span className="truncate text-[10px] text-muted-foreground">
							{pullState.error ? `Error: ${pullState.error}` : (pullState.status ?? "…")}
						</span>
					</div>
					{pct !== null && <Progress value={pct} className="h-1" />}
				</div>
				{!pullState.error && (
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
				)}
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
		<Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => onPull?.(modelId)}>
			<DownloadIcon size={12} />
			Pull
		</Button>
	);
}
