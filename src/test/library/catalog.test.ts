import { describe, expect, it } from "vitest";
import {
	computeFit,
	deriveTags,
	enrichCatalogModel,
	parseParamB,
	parsePullCount,
	requiredMemoryGb,
} from "#/features/library/lib/catalog";
import type { ModelTagInfo } from "#/features/library/lib/types";
import { makeHardware as hw, makeGpu, makeCatalogModel as model } from "#/test/factories";

describe("parseParamB", () => {
	it("parses billion-scale tags", () => {
		expect(parseParamB("8b")).toBe(8);
		expect(parseParamB("1.5b")).toBe(1.5);
		expect(parseParamB("0.5b")).toBe(0.5);
		expect(parseParamB("405B")).toBe(405);
	});

	it("parses million-scale tags into fractional billions", () => {
		expect(parseParamB("270m")).toBeCloseTo(0.27);
		expect(parseParamB("137m")).toBeCloseTo(0.137);
	});

	it("multiplies mixture-of-experts naming", () => {
		expect(parseParamB("8x7b")).toBe(56);
	});

	it("returns null for unparseable tags", () => {
		expect(parseParamB("latest")).toBeNull();
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
	it("uses the real download size when known", () => {
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

describe("enrichCatalogModel", () => {
	const tags: ModelTagInfo[] = [
		{ tag: "latest", digest: "46e0c10c039e", sizeGb: 4.9, contextK: 128 },
		{ tag: "8b", digest: "46e0c10c039e", sizeGb: 4.9, contextK: 128 },
		{ tag: "405b", digest: "dbd6b9ea93de", sizeGb: 243, contextK: 128 },
	];

	it("fills size and context for a size-tagged id", () => {
		const enriched = enrichCatalogModel({
			model: model({ id: "llama3.1:405b", name: "llama3.1", paramB: 405 }),
			tags,
		});
		expect(enriched.sizeGb).toBe(243);
		expect(enriched.contextK).toBe(128);
		expect(enriched.paramB).toBe(405);
	});

	it("maps a bare id to `latest` and recovers paramB via the digest", () => {
		const enriched = enrichCatalogModel({
			model: model({ id: "llama3.1", name: "llama3.1", paramB: null }),
			tags,
		});
		expect(enriched.sizeGb).toBe(4.9);
		expect(enriched.paramB).toBe(8);
	});

	it("re-derives display tags so a recovered small paramB earns fast", () => {
		const smallTags: ModelTagInfo[] = [
			{ tag: "latest", digest: "aabbccddeeff", sizeGb: 0.8, contextK: 32 },
			{ tag: "1b", digest: "aabbccddeeff", sizeGb: 0.8, contextK: 32 },
		];
		const enriched = enrichCatalogModel({
			model: model({ id: "smol", name: "smol", paramB: null, tags: [], capabilities: [] }),
			tags: smallTags,
		});
		expect(enriched.paramB).toBe(1);
		expect(enriched.tags).toContain("fast");
	});

	it("returns the model unchanged when its tag is missing from the page", () => {
		const original = model({ id: "llama3.1:70b", name: "llama3.1", paramB: 70 });
		expect(enrichCatalogModel({ model: original, tags })).toBe(original);
	});
});

const gpu = (totalVramMb: number) => makeGpu({ totalVramMb });

describe("computeFit", () => {
	it("returns null when the model has no size or parameter count", () => {
		const result = computeFit({
			model: model({ sizeGb: null, paramB: null }),
			hw: hw({ gpus: [gpu(8192)] }),
		});
		expect(result).toBeNull();
	});

	describe("GPU path", () => {
		it("returns gpu-optimal when VRAM headroom is ≥20%", () => {
			// sizeGb 4 → required 5.6; 16GB GPU → headroom 65%
			const result = computeFit({ model: model({ sizeGb: 4 }), hw: hw({ gpus: [gpu(16384)] }) });
			expect(result?.tier).toBe("gpu-optimal");
			expect(result?.gpuHeadroomPct).toBe(65);
			expect(result?.overall).toBeGreaterThanOrEqual(90);
		});

		it("returns gpu-tight when VRAM headroom is <20%", () => {
			// sizeGb 6 → required 7.9; 8GB GPU → headroom ≈1%
			const result = computeFit({ model: model({ sizeGb: 6 }), hw: hw({ gpus: [gpu(8192)] }) });
			expect(result?.tier).toBe("gpu-tight");
			expect(result?.gpuHeadroomPct).toBeLessThan(20);
			expect(result?.overall).toBeGreaterThanOrEqual(75);
			expect(result?.overall).toBeLessThan(90);
		});

		it("gpu-optimal at exactly 20% headroom", () => {
			// sizeGb 6 → required 7.9; 9.875GB (10112MB) GPU → headroom exactly 20%
			const result = computeFit({ model: model({ sizeGb: 6 }), hw: hw({ gpus: [gpu(10112)] }) });
			expect(result?.gpuHeadroomPct).toBe(20);
			expect(result?.tier).toBe("gpu-optimal");
		});

		it("picks the best GPU when multiple are present", () => {
			const gpus = [gpu(2048), gpu(16384), gpu(4096)];
			const result = computeFit({ model: model({ sizeGb: 4 }), hw: hw({ gpus }) });
			expect(result?.tier).toBe("gpu-optimal");
			expect(result?.gpuHeadroomPct).toBe(65);
		});

		it("returns gpu-partial when the model spills from VRAM into RAM", () => {
			// sizeGb 12 → required 14.8; 8GB GPU + 30GB usable RAM
			const result = computeFit({
				model: model({ sizeGb: 12 }),
				hw: hw({ gpus: [gpu(8192)], totalRamGb: 32 }),
			});
			expect(result?.tier).toBe("gpu-partial");
			expect(result?.gpuHeadroomPct).toBeNull();
			expect(result?.overall).toBeGreaterThanOrEqual(45);
			expect(result?.overall).toBeLessThan(75);
		});

		it("returns too-large when even VRAM plus RAM cannot hold the model", () => {
			// sizeGb 40 → required 47; 8GB GPU + 14GB usable RAM = 22GB
			const result = computeFit({
				model: model({ sizeGb: 40 }),
				hw: hw({ gpus: [gpu(8192)], totalRamGb: 16 }),
			});
			expect(result?.tier).toBe("too-large");
			expect(result?.overall).toBe(0);
		});
	});

	describe("CPU path", () => {
		it("returns cpu-only when no GPU and RAM is sufficient", () => {
			// sizeGb 8 → required 10.2; usable RAM 30 → headroom 19.8
			const result = computeFit({
				model: model({ sizeGb: 8 }),
				hw: hw({ gpus: null, totalRamGb: 32 }),
			});
			expect(result?.tier).toBe("cpu-only");
			expect(result?.cpuHeadroomGb).toBeCloseTo(19.8);
			expect(result?.overall).toBeGreaterThanOrEqual(40);
			expect(result?.overall).toBeLessThanOrEqual(70);
		});

		it("returns too-large when RAM is insufficient", () => {
			// sizeGb 30 → required 35.5; usable RAM 14
			const result = computeFit({
				model: model({ sizeGb: 30 }),
				hw: hw({ gpus: null, totalRamGb: 16 }),
			});
			expect(result?.tier).toBe("too-large");
			expect(result?.overall).toBe(0);
		});

		it("cpu-only when required memory exactly equals usable RAM", () => {
			// sizeGb 20 → required 24; totalRamGb 26 → usable 24
			const result = computeFit({
				model: model({ sizeGb: 20 }),
				hw: hw({ gpus: null, totalRamGb: 26 }),
			});
			expect(result?.tier).toBe("cpu-only");
			expect(result?.cpuHeadroomGb).toBe(0);
		});
	});

	describe("scoring", () => {
		it("estimates from paramB when no real size is known", () => {
			// paramB 8 → required 6.5; 16GB GPU → optimal
			const result = computeFit({
				model: model({ paramB: 8, sizeGb: null }),
				hw: hw({ gpus: [gpu(16384)] }),
			});
			expect(result?.tier).toBe("gpu-optimal");
		});

		it("overall is 90-100 for gpu-optimal and rounds to integer", () => {
			const result = computeFit({ model: model({ sizeGb: 1 }), hw: hw({ gpus: [gpu(16384)] }) });
			expect(result?.tier).toBe("gpu-optimal");
			expect(result?.overall).toBeGreaterThanOrEqual(90);
			expect(result?.overall).toBeLessThanOrEqual(100);
			expect(result?.overall).toBe(Math.round(result?.overall ?? 0));
		});

		it("ranks tiers by score: optimal > partial > too-large", () => {
			const machine = hw({ gpus: [gpu(8192)], totalRamGb: 32 });
			const optimal = computeFit({ model: model({ sizeGb: 4 }), hw: machine });
			const partial = computeFit({ model: model({ sizeGb: 12 }), hw: machine });
			const tooLarge = computeFit({ model: model({ sizeGb: 80 }), hw: machine });
			expect(optimal?.overall ?? 0).toBeGreaterThan(partial?.overall ?? 0);
			expect(partial?.overall ?? 0).toBeGreaterThan(tooLarge?.overall ?? 0);
		});
	});
});
