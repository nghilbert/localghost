import { describe, expect, it } from "vitest";
import { formatBytes, formatCount } from "#/shared/lib/format";

describe("formatBytes", () => {
	it("formats sub-kilobyte values as bytes", () => {
		expect(formatBytes(500)).toBe("500 B");
		expect(formatBytes(0)).toBe("0 B");
	});

	it("formats kilobytes", () => {
		expect(formatBytes(500_000)).toBe("500 KB");
	});

	it("formats megabytes", () => {
		expect(formatBytes(850_000_000)).toBe("850 MB");
	});

	it("formats gigabytes", () => {
		expect(formatBytes(4_700_000_000)).toBe("4.7 GB");
		expect(formatBytes(1_000_000_000)).toBe("1 GB");
	});

	it("formats terabytes for huge files", () => {
		expect(formatBytes(1_800_000_000_000)).toBe("1.8 TB");
	});
});

describe("formatCount", () => {
	it("leaves small counts as plain integers", () => {
		expect(formatCount(523)).toBe("523");
	});

	it("scales K/M/B/T for display", () => {
		expect(formatCount(9_400)).toBe("9.4K");
		expect(formatCount(116_600_000)).toBe("116.6M");
		expect(formatCount(2_000_000_000)).toBe("2B");
		expect(formatCount(1_800_000_000_000)).toBe("1.8T");
	});

	// Parameter counts reach the caller in billions, so call sites scale up rather
	// than carrying a second formatter.
	it("labels parameter counts scaled up from billions", () => {
		expect(formatCount(8 * 1e9)).toBe("8B");
		expect(formatCount(1800 * 1e9)).toBe("1.8T");
		// A sub-billion model reads as "600M" rather than the old "0.6B".
		expect(formatCount(0.6 * 1e9)).toBe("600M");
	});
});
