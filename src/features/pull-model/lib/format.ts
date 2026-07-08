/** Formats a byte count as KB, MB, or GB */
export function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	else if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
	return `${(bytes / 1e3).toFixed(2)} KB`;
}

/** Formats throughput as KB/s, MB/s, or GB/s */
export function formatBytesPerSec(bytesPerSec: number): string {
	return `${formatBytes(bytesPerSec)}/s`;
}

/** Duration in seconds formatted to `Xm Xs` */
export function formatDuration(seconds: number): string {
	const totalSecs = Math.round(seconds);
	const mins = Math.floor(totalSecs / 60);
	const secs = totalSecs % 60;
	return `${mins}m ${secs}s`;
}
