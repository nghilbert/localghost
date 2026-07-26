import { describe, expect, it } from "vitest";
import {
	availableMemoryGb,
	deriveTags,
	fitsHardware,
	formatPullCount,
	requiredMemoryGb,
} from "#/routes/_authenticated/library/-lib/catalog";
import { makeGpu, makeHardware } from "#/test/factories";

describe("formatPullCount", () => {
	it("scales K/M/B for display", () => {
		expect(formatPullCount(116_600_000)).toBe("116.6M");
		expect(formatPullCount(9_400)).toBe("9.4K");
		expect(formatPullCount(2_000_000_000)).toBe("2B");
	});

	it("leaves small counts as plain integers", () => {
		expect(formatPullCount(523)).toBe("523");
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
		const tags = deriveTags({ name: "gemma3", paramB: 1, capabilities: ["vision"] });
		expect(tags).toContain("vision");
		expect(tags).toContain("fast");
		expect(tags).not.toContain("code");
	});

	it("flags coding models via name", () => {
		expect(deriveTags({ name: "qwen2.5-coder", paramB: 7, capabilities: [] })).toContain("code");
	});

	it("does not flag large models fast", () => {
		expect(deriveTags({ name: "x", paramB: 14, capabilities: [] })).not.toContain("fast");
	});
});
