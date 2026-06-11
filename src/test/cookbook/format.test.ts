import { describe, expect, it } from "vitest";
import { formatBytes } from "#/features/cookbook/lib/format";

describe("formatBytes", () => {
	it("formats gigabytes with one decimal", () => {
		expect(formatBytes(4_700_000_000)).toBe("4.7 GB");
	});

	it("formats exactly 1e9 as GB", () => {
		expect(formatBytes(1_000_000_000)).toBe("1.0 GB");
	});

	it("formats megabytes with no decimals", () => {
		expect(formatBytes(850_000_000)).toBe("850 MB");
	});

	it("formats small values as 0 MB", () => {
		expect(formatBytes(0)).toBe("0 MB");
	});
});
