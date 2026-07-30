import { pullProgressPercent } from "#/shared/domain/model/pull-progress";

/** Formats a byte count as KB, MB, or GB */
export function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	else if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
	return `${(bytes / 1e3).toFixed(2)} KB`;
}

/** One-line percentage and byte detail, omitted until llama.cpp reports a usable total. */
export function formatPullDetail({
	completed,
	total,
}: {
	completed?: number;
	total?: number;
}): string | null {
	const percent = pullProgressPercent({ completed, total });
	if (percent === null || completed === undefined || total === undefined) return null;
	return `${Math.round(percent)}% · ${formatBytes(completed)} / ${formatBytes(total)}`;
}
