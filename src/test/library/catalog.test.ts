import { describe, expect, it } from "vitest";
import { computeFit } from "#/features/library/lib/catalog";
import { makeHardware as hw, makeGpu, makeCatalogModel as model } from "#/test/factories";

const gpu = (totalVramMb: number) => makeGpu({ totalVramMb });

describe("computeFit", () => {
	describe("GPU path", () => {
		it("returns gpu-optimal when VRAM headroom is ≥20%", () => {
			// model needs 4GB VRAM = 4096MB; GPU has 8192MB → headroom = 50%
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(8192)] }));
			expect(result.tier).toBe("gpu-optimal");
			expect(result.gpuHeadroomPct).toBe(50);
			expect(result.overall).toBeGreaterThanOrEqual(90);
		});

		it("returns gpu-tight when VRAM headroom is <20%", () => {
			// model needs 4GB = 4096MB; GPU has 4915MB → headroom ≈16.6%
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(4915)] }));
			expect(result.tier).toBe("gpu-tight");
			expect(result.gpuHeadroomPct).toBeLessThan(20);
			expect(result.overall).toBeGreaterThanOrEqual(70);
			expect(result.overall).toBeLessThan(90);
		});

		it("picks the best GPU when multiple are present", () => {
			const gpus = [gpu(2048), gpu(16384), gpu(4096)];
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus }));
			expect(result.tier).toBe("gpu-optimal"); // 16384MB >> 4096MB needed
			expect(result.gpuHeadroomPct).toBe(75);
		});

		it("falls back to CPU path when no GPU has enough VRAM", () => {
			// model needs 8GB VRAM; GPU only has 4096MB
			const result = computeFit(model({ vramGb: 8 }), hw({ gpus: [gpu(4096)], totalRamGb: 64 }));
			expect(result.tier).toBe("cpu-only");
		});

		it("gpuHeadroomPct is exactly 0 at 0% headroom (100% full)", () => {
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(4096)] }));
			expect(result.gpuHeadroomPct).toBe(0);
			expect(result.tier).toBe("gpu-tight");
		});

		it("gpuHeadroomPct is exactly 20 at the boundary → gpu-optimal", () => {
			// 20% headroom: vram = 4096, gpu = 5120 → headroom = 1024/5120 = 20%
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(5120)] }));
			expect(result.gpuHeadroomPct).toBe(20);
			expect(result.tier).toBe("gpu-optimal");
		});
	});

	describe("CPU path", () => {
		it("returns cpu-only when no GPU and sufficient RAM (totalRamGb - 2 - ramGb ≥ 0)", () => {
			// model.ramGb = 8, hw.totalRamGb = 32, usable = 30, headroom = 22
			const result = computeFit(model({ ramGb: 8 }), hw({ gpus: null, totalRamGb: 32 }));
			expect(result.tier).toBe("cpu-only");
			expect(result.cpuHeadroomGb).toBe(22);
			expect(result.overall).toBeGreaterThanOrEqual(40);
		});

		it("returns too-large when neither GPU nor RAM is sufficient", () => {
			// model.ramGb = 30, hw.totalRamGb = 16 → usable = 14, headroom = -16
			const result = computeFit(model({ ramGb: 30 }), hw({ gpus: null, totalRamGb: 16 }));
			expect(result.tier).toBe("too-large");
			expect(result.overall).toBeLessThanOrEqual(20);
		});

		it("cpu-only when model.ramGb exactly equals usable RAM (headroom = 0)", () => {
			// totalRamGb=10, usable=8, model.ramGb=8 → headroom = 0
			const result = computeFit(model({ ramGb: 8 }), hw({ gpus: null, totalRamGb: 10 }));
			expect(result.tier).toBe("cpu-only");
		});

		it("too-large when model needs 1GB more than usable (headroom = -1)", () => {
			// totalRamGb=10, usable=8, model.ramGb=9 → headroom = -1
			const result = computeFit(model({ ramGb: 9 }), hw({ gpus: null, totalRamGb: 10 }));
			expect(result.tier).toBe("too-large");
		});
	});

	describe("scoring", () => {
		it("overall is at least 90 for gpu-optimal", () => {
			const result = computeFit(model({ vramGb: 1 }), hw({ gpus: [gpu(16384)] }));
			expect(result.tier).toBe("gpu-optimal");
			expect(result.overall).toBeGreaterThanOrEqual(90);
			expect(result.overall).toBeLessThanOrEqual(100);
		});

		it("overall is 70–89 for gpu-tight", () => {
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(4096)] }));
			expect(result.overall).toBeGreaterThanOrEqual(70);
			expect(result.overall).toBeLessThan(90);
		});

		it("overall is 40–70 for cpu-only", () => {
			const result = computeFit(model({ ramGb: 8 }), hw({ gpus: null, totalRamGb: 32 }));
			expect(result.overall).toBeGreaterThanOrEqual(40);
			expect(result.overall).toBeLessThanOrEqual(70);
		});

		it("overall rounds to integer", () => {
			const result = computeFit(model({ vramGb: 4 }), hw({ gpus: [gpu(8192)] }));
			expect(result.overall).toBe(Math.round(result.overall));
		});
	});

	describe("gpuHeadroomPct", () => {
		it("is null when taking the CPU path", () => {
			const result = computeFit(model({ ramGb: 8 }), hw({ gpus: null, totalRamGb: 32 }));
			expect(result.gpuHeadroomPct).toBeNull();
		});

		it("is null when GPU is present but insufficient", () => {
			const result = computeFit(model({ vramGb: 8 }), hw({ gpus: [gpu(4096)], totalRamGb: 64 }));
			expect(result.gpuHeadroomPct).toBeNull();
		});
	});
});
