const LOCALE = "en-US";

/** Bytes in a kibibyte. Sizes are binary throughout, as llama.cpp and `os` report them. */
const KIB = 1024;
/** Bytes in a mebibyte. */
export const MIB = 1_048_576;
/** Bytes in a gibibyte. */
export const GIB = 1_073_741_824;
// Index n labels KIB ** n bytes, with the short labels operating systems show.
const BYTE_LABELS = ["B", "KB", "MB", "GB", "TB"] as const;

/** A billion, e.g. to turn billions of parameters into a count. */
export const BILLION = 1e9;

/** Seconds in a minute. */
export const SECONDS_PER_MINUTE = 60;
/** Seconds in an hour. */
const SECONDS_PER_HOUR = 3600;
/** Seconds in a day. */
export const SECONDS_PER_DAY = 86_400;
/** Milliseconds in a second. */
export const MS_PER_SECOND = 1000;
/** Milliseconds in a minute. */
export const MS_PER_MINUTE = 60_000;
/** Milliseconds in an hour. */
export const MS_PER_HOUR = 3_600_000;
/** Milliseconds in a day. */
export const MS_PER_DAY = 86_400_000;

const upToOneDecimalFormat = new Intl.NumberFormat(LOCALE, {
	useGrouping: false,
	maximumFractionDigits: 1,
});
// A fixed decimal keeps a climbing count the same width.
const oneDecimalFormat = new Intl.NumberFormat(LOCALE, {
	useGrouping: false,
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});
const integerFormat = new Intl.NumberFormat(LOCALE, {
	useGrouping: false,
	maximumFractionDigits: 0,
});
const groupedFormat = new Intl.NumberFormat(LOCALE);
const compactFormat = new Intl.NumberFormat(LOCALE, {
	notation: "compact",
	maximumFractionDigits: 1,
});
// Rounded down, so it reads 100% only when complete.
const percentFormat = new Intl.NumberFormat(LOCALE, {
	style: "percent",
	maximumFractionDigits: 0,
	roundingMode: "floor",
});
const dateFormat = new Intl.DateTimeFormat(LOCALE);

// Seconds always show, or zero formats as an empty string.
const durationFormat = new Intl.DurationFormat(LOCALE, {
	style: "narrow",
	secondsDisplay: "always",
});

/** The exponent of the largest power of `base` at or below `value`, capped at `max`. */
function floorLog({ value, base, max }: { value: number; base: number; max: number }): number {
	if (value < base) return 0;
	const exponent = Math.min(Math.floor(Math.log(value) / Math.log(base)), max);
	// The log can land a hair off an exact power.
	if (base ** exponent > value) return exponent - 1;
	if (exponent < max && base ** (exponent + 1) <= value) return exponent + 1;
	return exponent;
}

/** Rounds to one decimal place, e.g. 4.66 is 4.7 and 2.0 is 2. */
export function roundToTenth(value: number): number {
	return Math.round(value * 10) / 10;
}

/** The largest unit that shows `bytes` below 1024 once rounded. */
function byteUnit(bytes: number): { size: number; label: string } {
	const max = BYTE_LABELS.length - 1;
	const fits = floorLog({ value: bytes, base: KIB, max });
	const exponent = fits < max && roundToTenth(bytes / KIB ** fits) >= KIB ? fits + 1 : fits;
	return { size: KIB ** exponent, label: BYTE_LABELS[exponent] ?? "B" };
}

/** Formats a byte count in the largest fitting unit, e.g. `4.7 * GIB` is "4.7 GB". */
export function formatBytes(bytes: number): string {
	const { size, label } = byteUnit(bytes);
	return `${upToOneDecimalFormat.format(bytes / size)} ${label}`;
}

/**
 * Formats bytes done of a total as "1.2 / 4.7 GB": both in the total's unit with one
 * decimal, so the text keeps its length as the count climbs.
 */
export function formatByteProgress({ done, total }: { done: number; total: number }): string {
	const { size, label } = byteUnit(total);
	const numberFormat = size === 1 ? integerFormat : oneDecimalFormat;
	return `${numberFormat.format(done / size)} / ${numberFormat.format(total / size)} ${label}`;
}

/** Formats a number with thousands separators, e.g. 12345 is "12,345". */
export function formatNumber(value: number): string {
	return groupedFormat.format(value);
}

/** Formats a number with exactly one decimal, e.g. 0.7 is "0.7" and 1 is "1.0". */
export function formatDecimal(value: number): string {
	return oneDecimalFormat.format(value);
}

/** Formats a ratio as a whole percent, rounded down, e.g. 0.999 is "99%". */
export function formatPercent(ratio: number): string {
	return percentFormat.format(ratio);
}

/** Formats a date as "9/29/2026". */
export function formatDate(value: Date): string {
	return dateFormat.format(value);
}

/** Formats a count compactly with K, M, B, or T, e.g. 4_700_000 is "4.7M". */
export function formatCount(value: number): string {
	return compactFormat.format(value);
}

/** Formats whole seconds as "42s", "3m 5s" or "1h 5s", leaving out zero hours and minutes. */
export function formatSeconds(seconds: number): string {
	return durationFormat.format({
		hours: Math.floor(seconds / SECONDS_PER_HOUR),
		minutes: Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
		seconds: seconds % SECONDS_PER_MINUTE,
	});
}
