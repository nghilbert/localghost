import { tv, type VariantProps } from "tailwind-variants";
import { Progress } from "#/shared/components/ui/progress";
import { Spinner } from "#/shared/components/ui/spinner";
import { formatPullDetail } from "#/shared/domain/model/pull-format";
import { pullProgressPercent } from "#/shared/domain/model/pull-progress";
import type { PullProgress } from "#/shared/domain/model/types";

const downloadStatus = tv({
	slots: {
		root: "flex flex-col gap-1",
		spinner: "text-muted-foreground",
		detail: "text-muted-foreground tabular-nums",
	},
	variants: {
		size: {
			sm: { spinner: "size-3", detail: "text-xs" },
			md: { spinner: "size-4", detail: "text-sm" },
		},
	},
	defaultVariants: { size: "md" },
});

type DownloadStatusProps = VariantProps<typeof downloadStatus> & {
	pullState: PullProgress;
	className?: string;
};

/**
 * The meter for one in-flight download: a determinate bar plus a byte detail line once
 * llama.cpp reports counts, a spinner until then.
 */
export function DownloadStatus({ pullState, size, className }: DownloadStatusProps) {
	const styles = downloadStatus({ size });
	const percent = pullProgressPercent(pullState);
	const detail = formatPullDetail(pullState);

	return (
		<div className={styles.root({ className })}>
			{percent === null ? (
				<Spinner className={styles.spinner()} data-testid="download-status-spinner" />
			) : (
				<Progress
					value={percent}
					aria-label="Model download progress"
					data-testid="download-status-progress"
				/>
			)}
			{detail && (
				<span className={styles.detail()} data-testid="download-status-detail">
					{detail}
				</span>
			)}
		</div>
	);
}
