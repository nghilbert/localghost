import { describe, expect, it } from "vitest";
import { formatBytes, formatPullDetail } from "#/shared/domain/model/pull-format";
import { pullProgressPercent } from "#/shared/domain/model/pull-progress";

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

describe("formatPullDetail", () => {
	it("formats aggregate router file progress", () => {
		expect(formatPullDetail({ completed: 12_300_000, total: 20_000_000 })).toBe(
			"62% · 12.3 MB / 20.0 MB",
		);
	});

	it("omits progress until the router reports a total", () => {
		expect(formatPullDetail({ completed: 12_300_000 })).toBeNull();
	});
});

describe("pullProgressPercent", () => {
	it("preserves fractional progress for the bar and clamps it to the valid range", () => {
		expect(pullProgressPercent({ completed: 1, total: 3 })).toBeCloseTo(33.333);
		expect(pullProgressPercent({ completed: 120, total: 100 })).toBe(100);
		expect(pullProgressPercent({ completed: -10, total: 100 })).toBe(0);
	});

	it("is indeterminate until a positive total is available", () => {
		expect(pullProgressPercent({ completed: 10 })).toBeNull();
		expect(pullProgressPercent({ completed: 10, total: 0 })).toBeNull();
	});
});
