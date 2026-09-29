import { describe, expect, it } from "vitest";
import {
	formatByteProgress,
	formatBytes,
	formatCount,
	formatSeconds,
	GIB,
	MIB,
} from "#/lib/format";

describe("formatBytes", () => {
	it("formats sub-kilobyte values as bytes", () => {
		expect(formatBytes(500)).toBe("500 B");
		expect(formatBytes(0)).toBe("0 B");
	});

	it("scales by 1024 per unit", () => {
		expect(formatBytes(512 * 1024)).toBe("512 KB");
		expect(formatBytes(850 * MIB)).toBe("850 MB");
		expect(formatBytes(4.7 * GIB)).toBe("4.7 GB");
		expect(formatBytes(GIB)).toBe("1 GB");
		expect(formatBytes(1.8 * 1024 * GIB)).toBe("1.8 TB");
	});

	it("reads a decimal gigabyte as less than one GB", () => {
		expect(formatBytes(1_000_000_000)).toBe("953.7 MB");
	});
});

describe("formatByteProgress", () => {
	it("puts both counts in the total's unit with a fixed decimal", () => {
		expect(formatByteProgress({ done: GIB, total: 4.7 * GIB })).toBe("1.0 / 4.7 GB");
		expect(formatByteProgress({ done: 950 * MIB, total: 4 * GIB })).toBe("0.9 / 4.0 GB");
	});

	it("keeps whole bytes below a kilobyte", () => {
		expect(formatByteProgress({ done: 30, total: 120 })).toBe("30 / 120 B");
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

	it("labels parameter counts scaled up from billions", () => {
		expect(formatCount(8 * 1e9)).toBe("8B");
		expect(formatCount(1800 * 1e9)).toBe("1.8T");
		expect(formatCount(0.6 * 1e9)).toBe("600M");
	});
});

describe("formatSeconds", () => {
	it("shows seconds under a minute", () => {
		expect(formatSeconds(42)).toBe("42s");
	});

	it("adds minutes from a minute up", () => {
		expect(formatSeconds(60)).toBe("1m 0s");
		expect(formatSeconds(185)).toBe("3m 5s");
	});
});
