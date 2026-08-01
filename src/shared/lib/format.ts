function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Scales a byte count to the largest whole unit, e.g. 4_700_000_000 → "4.7 GB". */
export function formatBytes(bytes: number): string {
	if (bytes >= 1e12) return `${round1(bytes / 1e12)} TB`;
	if (bytes >= 1e9) return `${round1(bytes / 1e9)} GB`;
	if (bytes >= 1e6) return `${round1(bytes / 1e6)} MB`;
	if (bytes >= 1e3) return `${round1(bytes / 1e3)} KB`;
	return `${bytes} B`;
}

/** Scales a plain count to K/M/B/T for compact display, e.g. 4_700_000 → "4.7M". */
export function formatCount(value: number): string {
	if (value >= 1e12) return `${round1(value / 1e12)}T`;
	if (value >= 1e9) return `${round1(value / 1e9)}B`;
	if (value >= 1e6) return `${round1(value / 1e6)}M`;
	if (value >= 1e3) return `${round1(value / 1e3)}K`;
	return String(value);
}
