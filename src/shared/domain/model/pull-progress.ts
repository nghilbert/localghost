import type { LlamaDownloadFileProgress } from "#/shared/domain/model/schemas";
import type { PullProgress } from "#/shared/domain/model/types";

/** Aggregates llama.cpp's parallel file downloads into one model-level progress value. */
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

/** A clamped 0-100 progress value, or null until both byte counts are usable. */
export function pullProgressPercent({
	completed,
	total,
}: Pick<PullProgress, "completed" | "total">): number | null {
	if (completed === undefined || total === undefined || total <= 0) return null;
	return Math.min(100, Math.max(0, (completed / total) * 100));
}
