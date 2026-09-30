import { describe, expect, it } from "vitest";
import { MIB } from "#/lib/format";
import { formatPullDetail } from "./pull-format";
import { pullProgressPercent } from "./pull-progress";

describe("formatPullDetail", () => {
	it("formats aggregate router file progress", () => {
		expect(formatPullDetail({ completed: 12.3 * MIB, total: 20 * MIB })).toBe(
			"61% · 12.3 / 20.0 MB",
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
