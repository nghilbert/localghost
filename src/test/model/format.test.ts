import { describe, expect, it } from "vitest";
import { formatBytes, formatPullDetail } from "#/shared/domain/model/pull-format";

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
			"12.3 MB / 20.0 MB",
		);
	});

	it("omits progress until the router reports a total", () => {
		expect(formatPullDetail({ completed: 12_300_000 })).toBeNull();
	});
});
