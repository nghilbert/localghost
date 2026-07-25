import { describe, expect, it } from "vitest";
import {
	availableMemoryGb,
	deriveTags,
	fitsHardware,
	parseParamB,
	parsePullCount,
	requiredMemoryGb,
} from "#/routes/_authenticated/library/-lib/catalog";
import { makeGpu, makeHardware } from "#/test/factories";

describe("parseParamB", () => {
	it("parses billion-scale HF repo ids", () => {
		expect(parseParamB("Qwen3-8B")).toBe(8);
		expect(parseParamB("gemma-3-4b-it")).toBe(4);
		expect(parseParamB("Llama-3.1-405B-Instruct")).toBe(405);
	});

	it("parses million-scale tags into fractional billions", () => {
		expect(parseParamB("gemma-3-270m-it")).toBeCloseTo(0.27);
	});

	it("multiplies mixture-of-experts naming", () => {
		expect(parseParamB("Mixtral-8x7B-Instruct")).toBe(56);
	});

	it("parses a size token embedded in a longer repo path", () => {
		expect(parseParamB("ggml-org/embeddinggemma-300M-GGUF")).toBeCloseTo(0.3);
	});

	it("returns null for unparseable ids", () => {
		expect(parseParamB("some-repo-without-a-size")).toBeNull();
		expect(parseParamB("")).toBeNull();
	});
});

describe("parsePullCount", () => {
	it("scales K/M/B suffixes", () => {
		expect(parsePullCount("116.6M")).toBe(116_600_000);
		expect(parsePullCount("9.4K")).toBe(9400);
		expect(parsePullCount("2B")).toBe(2_000_000_000);
	});

	it("parses plain integers and is case-insensitive", () => {
		expect(parsePullCount("523")).toBe(523);
		expect(parsePullCount("1.2m")).toBe(1_200_000);
	});

	it("returns 0 for empty or unparseable values", () => {
		expect(parsePullCount("")).toBe(0);
		expect(parsePullCount("lots")).toBe(0);
	});
});

describe("requiredMemoryGb", () => {
	it("uses the exact GGUF size when known", () => {
		// 4.9 * 1.15 + 1 = 6.635 → 6.6, regardless of paramB
		expect(requiredMemoryGb({ sizeGb: 4.9, paramB: 70 })).toBeCloseTo(6.6);
	});

	it("falls back to a Q4 estimate from the parameter count", () => {
		// 8 * 0.6 = 4.8 weights → 4.8 * 1.15 + 1 = 6.52 → 6.5
		expect(requiredMemoryGb({ sizeGb: null, paramB: 8 })).toBeCloseTo(6.5);
	});

	it("is null when neither size nor parameter count is known", () => {
		expect(requiredMemoryGb({ sizeGb: null, paramB: null })).toBeNull();
	});
});

describe("availableMemoryGb", () => {
	it("uses free RAM when no GPU is detected", () => {
		expect(availableMemoryGb(makeHardware({ freeRamGb: 16, gpus: null }))).toBe(16);
	});

	it("uses the best GPU's free VRAM over RAM when a GPU is present", () => {
		const hardware = makeHardware({
			freeRamGb: 16,
			gpus: [makeGpu({ freeVramMb: 4096 }), makeGpu({ freeVramMb: 12_288 })],
		});
		expect(availableMemoryGb(hardware)).toBe(12);
	});
});

describe("fitsHardware", () => {
	it("fits when the required memory is within what's available", () => {
		const hardware = makeHardware({ freeRamGb: 16, gpus: null });
		// 8b * 0.6 = 4.8 weights → 4.8 * 1.15 + 1 = 6.52 ≈ 6.5, well under 16
		expect(fitsHardware({ model: { sizeGb: null, paramB: 8 }, hardware })).toBe(true);
	});

	it("does not fit when the required memory exceeds what's available", () => {
		const hardware = makeHardware({ freeRamGb: 4, gpus: null });
		expect(fitsHardware({ model: { sizeGb: null, paramB: 70 }, hardware })).toBe(false);
	});

	it("does not fit when the memory requirement is unknown", () => {
		const hardware = makeHardware({ freeRamGb: 999, gpus: null });
		expect(fitsHardware({ model: { sizeGb: null, paramB: null }, hardware })).toBe(false);
	});
});

describe("deriveTags", () => {
	it("keeps capability badges and flags small models fast", () => {
		const tags = deriveTags({
			name: "gemma3",
			description: "small",
			paramB: 1,
			capabilities: ["vision"],
		});
		expect(tags).toContain("vision");
		expect(tags).toContain("fast");
		expect(tags).not.toContain("code");
	});

	it("flags coding models via name or description", () => {
		expect(
			deriveTags({ name: "qwen2.5-coder", description: "", paramB: 7, capabilities: [] }),
		).toContain("code");
	});

	it("does not flag large models fast", () => {
		expect(deriveTags({ name: "x", description: "", paramB: 14, capabilities: [] })).not.toContain(
			"fast",
		);
	});
});
