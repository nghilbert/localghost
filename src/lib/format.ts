/** Rounds to one decimal place, e.g. 4.66 is 4.7 and 2.0 is 2. */
export function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Bytes in a kibibyte. */
const KIB = 1024;
/** Bytes in a mebibyte. Sizes are binary throughout, as llama.cpp and `os` report them. */
export const MIB = KIB ** 2;
/** Bytes in a gibibyte. */
export const GIB = KIB ** 3;
/** Bytes in a tebibyte. */
const TIB = KIB ** 4;

// Binary sizes with the familiar short labels, as operating systems show them.
const BYTE_UNITS = [
	{ size: TIB, label: "TB" },
	{ size: GIB, label: "GB" },
	{ size: MIB, label: "MB" },
	{ size: KIB, label: "KB" },
	{ size: 1, label: "B" },
] as const;

function byteUnit(bytes: number) {
	return BYTE_UNITS.find(({ size }) => bytes >= size) ?? { size: 1, label: "B" };
}

/** Formats a byte count in the largest fitting unit, e.g. `4.7 * GIB` is "4.7 GB". */
export function formatBytes(bytes: number): string {
	const { size, label } = byteUnit(bytes);
	return `${round1(bytes / size)} ${label}`;
}

/**
 * Formats bytes done of a total as "1.2 / 4.7 GB": both in the total's unit with one
 * decimal, so the text keeps its length as the count climbs.
 */
export function formatByteProgress({ done, total }: { done: number; total: number }): string {
	const { size, label } = byteUnit(total);
	const digits = size === 1 ? 0 : 1;
	return `${(done / size).toFixed(digits)} / ${(total / size).toFixed(digits)} ${label}`;
}

/** Formats a count compactly with K, M, B, or T, e.g. 4_700_000 is "4.7M". */
export function formatCount(value: number): string {
	if (value >= 1e12) return `${round1(value / 1e12)}T`;
	if (value >= 1e9) return `${round1(value / 1e9)}B`;
	if (value >= 1e6) return `${round1(value / 1e6)}M`;
	if (value >= 1e3) return `${round1(value / 1e3)}K`;
	return String(value);
}
