import { tv, type VariantProps } from "tailwind-variants";
import { Progress } from "#/components/ui/progress";
import { formatPullDetail } from "#/features/library/lib/pull-format";
import { pullProgressPercent } from "#/features/library/lib/pull-progress";
import type { PullProgress } from "#/features/library/library.types";

// One bar and one line from the first tick to the last, so a running download keeps
// its height and never reflows the list around it.
const downloadStatusSlots = tv({
	slots: {
		root: "flex min-w-0 flex-col gap-1.5",
		detail: "truncate text-muted-fg tabular-nums",
	},
	variants: {
		size: {
			sm: { detail: "text-xs" },
			md: { detail: "text-sm" },
		},
	},
	defaultVariants: { size: "md" },
});

type DownloadStatusProps = VariantProps<typeof downloadStatusSlots> & {
	pullState: PullProgress;
	className?: string;
};

/** A running download's progress bar and byte counts; the bar is indeterminate until llama.cpp reports a total. */
export function DownloadStatus({ pullState, size = "md", className }: DownloadStatusProps) {
	const styles = downloadStatusSlots({ size });

	return (
		<div className={styles.root({ className })}>
			<Progress.Root value={pullProgressPercent(pullState)} aria-label="Model download progress">
				<Progress.Track>
					<Progress.Indicator />
				</Progress.Track>
			</Progress.Root>
			<span className={styles.detail()}>{formatPullDetail(pullState) ?? "Starting download"}</span>
		</div>
	);
}
