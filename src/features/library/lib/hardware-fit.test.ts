import { describe, expect, it } from "vitest";
import { makeGpu, makeHardware } from "#/test/factories";
import {
	availableMemoryGb,
	bestGpu,
	classifyHardwareFit,
	requiredMemoryGb,
	totalMemoryGb,
} from "./hardware-fit";

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

describe("totalMemoryGb", () => {
	it("uses total RAM when no GPU is detected", () => {
		expect(totalMemoryGb(makeHardware({ totalRamGb: 32, gpus: null }))).toBe(32);
	});

	it("uses the best GPU's total VRAM over RAM when a GPU is present", () => {
		const hardware = makeHardware({
			totalRamGb: 32,
			gpus: [makeGpu({ totalVramMb: 8192 }), makeGpu({ totalVramMb: 24_576 })],
		});
		expect(totalMemoryGb(hardware)).toBe(24);
	});
});

describe("classifyHardwareFit", () => {
	it("is null without hardware info", () => {
		expect(
			classifyHardwareFit({
				requiredGb: requiredMemoryGb({ sizeGb: null, paramB: 8 }),
				hardware: undefined,
			}),
		).toBeNull();
	});

	it("is unknown when the memory requirement can't be estimated", () => {
		const hardware = makeHardware({ freeRamGb: 999, totalRamGb: 999, gpus: null });
		expect(
			classifyHardwareFit({
				requiredGb: requiredMemoryGb({ sizeGb: null, paramB: null }),
				hardware,
			}),
		).toBe("unknown");
	});

	it("fits when required memory is within what's free right now", () => {
		const hardware = makeHardware({ freeRamGb: 16, totalRamGb: 32, gpus: null });
		expect(
			classifyHardwareFit({ requiredGb: requiredMemoryGb({ sizeGb: null, paramB: 8 }), hardware }),
		).toBe("fits");
	});

	it("is tight when it exceeds free memory but fits the machine's total capacity", () => {
		// required ≈ 6.5GB: over 4GB free, but under 32GB total
		const hardware = makeHardware({ freeRamGb: 4, totalRamGb: 32, gpus: null });
		expect(
			classifyHardwareFit({ requiredGb: requiredMemoryGb({ sizeGb: null, paramB: 8 }), hardware }),
		).toBe("tight");
	});

	it("won't fit when required memory exceeds the machine's total capacity", () => {
		const hardware = makeHardware({ freeRamGb: 4, totalRamGb: 8, gpus: null });
		expect(
			classifyHardwareFit({ requiredGb: requiredMemoryGb({ sizeGb: null, paramB: 70 }), hardware }),
		).toBe("wont-fit");
	});
});

describe("classifyHardwareFit by requirement", () => {
	it("classifies a known requirement against free and total memory", () => {
		const hardware = makeHardware({ freeRamGb: 8, totalRamGb: 16, gpus: null });
		expect(classifyHardwareFit({ requiredGb: 6, hardware })).toBe("fits");
		expect(classifyHardwareFit({ requiredGb: 12, hardware })).toBe("tight");
		expect(classifyHardwareFit({ requiredGb: 20, hardware })).toBe("wont-fit");
	});

	it("is unknown without a requirement, and null without hardware", () => {
		expect(classifyHardwareFit({ requiredGb: null, hardware: makeHardware({}) })).toBe("unknown");
		expect(classifyHardwareFit({ requiredGb: 6, hardware: undefined })).toBeNull();
	});
});

describe("bestGpu", () => {
	it("picks the GPU with the most of the given VRAM figure", () => {
		const big = makeGpu({ totalVramMb: 24_576 });
		const hardware = makeHardware({ gpus: [makeGpu({ totalVramMb: 8192 }), big] });
		expect(bestGpu({ hardware, key: "totalVramMb" })).toBe(big);
		expect(bestGpu({ hardware: makeHardware({ gpus: null }), key: "totalVramMb" })).toBeNull();
	});
});
