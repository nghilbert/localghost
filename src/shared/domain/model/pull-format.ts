/** Formats a byte count as KB, MB, or GB */
export function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	else if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
	return `${(bytes / 1e3).toFixed(2)} KB`;
}

/** One-line `<done> / <total>`, omitting it until llama.cpp reports file progress. */
export function formatPullDetail({
	completed,
	total,
}: {
	completed?: number;
	total?: number;
}): string | null {
	if (completed === undefined || !total) return null;
	return `${formatBytes(completed)} / ${formatBytes(total)}`;
}
