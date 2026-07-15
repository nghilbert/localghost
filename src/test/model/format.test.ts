import { describe, expect, it } from "vitest";
import { formatBytes, formatBytesPerSec, formatDuration } from "#/shared/domain/model/pull-format";

describe("formatBytes", () => {
	it("formats gigabytes with one decimal", () => {
		expect(formatBytes(4_700_000_000)).toBe("4.7 GB");
	});

	it("formats exactly 1e9 as GB", () => {
		expect(formatBytes(1_000_000_000)).toBe("1.0 GB");
	});

	it("formats megabytes with one decimal", () => {
		expect(formatBytes(850_000_000)).toBe("850.0 MB");
	});

	it("formats sub-megabyte values as KB", () => {
		expect(formatBytes(500_000)).toBe("500.00 KB");
	});

	it("formats zero as KB", () => {
		expect(formatBytes(0)).toBe("0.00 KB");
	});
});

describe("formatBytesPerSec", () => {
	it("appends /s to the byte size unit", () => {
		expect(formatBytesPerSec(12_300_000)).toBe("12.3 MB/s");
	});

	it("scales up to GB/s", () => {
		expect(formatBytesPerSec(2_000_000_000)).toBe("2.0 GB/s");
	});
});

describe("formatDuration", () => {
	it("formats minutes and seconds", () => {
		expect(formatDuration(187)).toBe("3m 7s");
	});

	it("formats sub-minute durations with zero minutes", () => {
		expect(formatDuration(42)).toBe("0m 42s");
	});

	it("rounds fractional seconds", () => {
		expect(formatDuration(59.6)).toBe("1m 0s");
	});
});
