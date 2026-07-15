import { describe, expect, it } from "vitest";
import { parseNvidiaSmi, parseRocmSmi } from "#/shared/domain/model/hardware.server";

describe("parseNvidiaSmi", () => {
	it("maps each CSV line to a GPU with MB values", () => {
		const out = "NVIDIA GeForce RTX 4090, 24564, 23000\nNVIDIA RTX A6000, 49140, 49000\n";
		expect(parseNvidiaSmi(out)).toEqual([
			{ name: "NVIDIA GeForce RTX 4090", vendor: "nvidia", totalVramMb: 24564, freeVramMb: 23000 },
			{ name: "NVIDIA RTX A6000", vendor: "nvidia", totalVramMb: 49140, freeVramMb: 49000 },
		]);
	});

	it("returns null for empty or whitespace-only output", () => {
		expect(parseNvidiaSmi("")).toBeNull();
		expect(parseNvidiaSmi("  \n  \n")).toBeNull();
	});

	it("defaults name and zeroes non-numeric fields on a malformed line", () => {
		expect(parseNvidiaSmi(", , \n")).toEqual([
			{ name: "Unknown GPU", vendor: "nvidia", totalVramMb: 0, freeVramMb: 0 },
		]);
	});

	it("zeroes missing fields when a line has too few columns", () => {
		expect(parseNvidiaSmi("Some GPU")).toEqual([
			{ name: "Some GPU", vendor: "nvidia", totalVramMb: 0, freeVramMb: 0 },
		]);
	});
});

describe("parseRocmSmi", () => {
	it("converts byte totals to MB and derives free VRAM", () => {
		const out = JSON.stringify({
			card0: {
				"VRAM Total Memory (B)": 17179869184,
				"VRAM Total Used Memory (B)": 1073741824,
			},
		});
		expect(parseRocmSmi(out)).toEqual([
			{ name: "card0", vendor: "amd", totalVramMb: 16384, freeVramMb: 15360 },
		]);
	});

	it("treats missing byte fields as zero", () => {
		const out = JSON.stringify({ card0: { "VRAM Total Memory (B)": 0 } });
		expect(parseRocmSmi(out)).toEqual([
			{ name: "card0", vendor: "amd", totalVramMb: 0, freeVramMb: 0 },
		]);
	});

	it("returns null when no cards are reported", () => {
		expect(parseRocmSmi("{}")).toBeNull();
	});

	it("throws on a shape that isn't card-keyed number maps", () => {
		expect(() => parseRocmSmi(JSON.stringify({ card0: "nope" }))).toThrow();
	});
});
