import type { PullProgress } from "#/features/library/library.types";
import type { LlamaDownloadFileProgress } from "#/lib/llamacpp/schemas";

/** Sums a model's file downloads into one progress value. */
export function aggregatePullProgress(
	files: Record<string, LlamaDownloadFileProgress>,
): PullProgress {
	const progress = Object.values(files);
	if (progress.length === 0) return { status: "Downloading" };
	return {
		status: "Downloading",
		completed: progress.reduce((sum, file) => sum + file.done, 0),
		total: progress.reduce((sum, file) => sum + file.total, 0),
	};
}

/** Progress from 0 to 100, or null until both byte counts are known. */
export function pullProgressPercent({
	completed,
	total,
}: Pick<PullProgress, "completed" | "total">): number | null {
	if (completed === undefined || total === undefined || total <= 0) return null;
	return Math.min(100, Math.max(0, (completed / total) * 100));
}
