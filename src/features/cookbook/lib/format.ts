export function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	return `${(bytes / 1e6).toFixed(0)} MB`;
}
