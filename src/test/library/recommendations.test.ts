import { describe, expect, it } from "vitest";
import { pickRecommendedModels } from "#/features/library/lib/recommendations";
import type { CatalogModel } from "#/features/library/lib/types";
import { makeCatalogModel, makeGpu, makeHardware, makeInstalledModel } from "#/test/factories";

const catalog: CatalogModel[] = [
	makeCatalogModel({ id: "gemma3:1b", paramB: 1, sizeGb: 0.8, tags: ["fast"] }),
	makeCatalogModel({ id: "llama3.1:8b", paramB: 8, sizeGb: 4.9, tags: ["chat"] }),
	makeCatalogModel({ id: "qwen2.5:32b", paramB: 32, sizeGb: 19.9, tags: ["chat"] }),
	makeCatalogModel({ id: "qwen2.5-coder:7b", paramB: 7, sizeGb: 4.7, tags: ["code"] }),
	makeCatalogModel({ id: "nomic-embed-text", paramB: 0.1, sizeGb: 0.3, tags: ["embedding"] }),
	makeCatalogModel({ id: "llama3.1:405b", paramB: 405, sizeGb: 243, tags: ["chat"] }),
	makeCatalogModel({ id: "weird:latest", paramB: null, sizeGb: null, tags: [] }),
];

const bigGpuBox = makeHardware({
	totalRamGb: 64,
	gpus: [makeGpu({ totalVramMb: 24576, freeVramMb: 23000 })],
});
const cpuOnlyBox = makeHardware({ totalRamGb: 16, gpus: null });
const tinyBox = makeHardware({ totalRamGb: 2, gpus: null });

function pick(hw: ReturnType<typeof makeHardware>, ...names: string[]) {
	return pickRecommendedModels({
		hw,
		installed: names.map((name) => makeInstalledModel({ name })),
		catalog,
	});
}

describe("pickRecommendedModels", () => {
	it("returns at most three deduped recommendations with distinct reasons", () => {
		const recs = pick(bigGpuBox);
		expect(recs.length).toBeGreaterThan(0);
		expect(recs.length).toBeLessThanOrEqual(3);
		expect(new Set(recs.map((r) => r.model.id)).size).toBe(recs.length);
		expect(new Set(recs.map((r) => r.reason)).size).toBe(recs.length);
	});

	it("never recommends embedding models, unknown sizes, or non-fitting models", () => {
		for (const hw of [bigGpuBox, cpuOnlyBox, tinyBox]) {
			for (const { model, fit } of pick(hw)) {
				expect(model.tags).not.toContain("embedding");
				expect(model.paramB !== null || model.sizeGb !== null).toBe(true);
				expect(fit.tier).not.toBe("too-large");
			}
		}
	});

	it("picks a small model as fastest and a code model for coding", () => {
		const recs = pick(bigGpuBox);
		expect(recs.find((r) => r.reason === "fastest")?.model.paramB).toBeLessThanOrEqual(3);
		expect(recs.find((r) => r.reason === "best-coding")?.model.tags).toContain("code");
	});

	it("excludes installed models, including :latest-suffixed names", () => {
		const fastestId = pick(cpuOnlyBox).find((r) => r.reason === "fastest")?.model.id;
		expect(fastestId).toBeDefined();
		const next = pick(cpuOnlyBox, `${fastestId}:latest`);
		expect(next.map((r) => r.model.id)).not.toContain(fastestId);
	});

	it("still recommends cpu-only fits on modest hardware", () => {
		for (const { fit } of pick(cpuOnlyBox)) {
			expect(fit.tier).toBe("cpu-only");
		}
	});

	it("recommends a model whose size is known but parameter count is not", () => {
		const sizeOnly: CatalogModel[] = [
			makeCatalogModel({ id: "mystery", paramB: null, sizeGb: 4.9, tags: ["chat"] }),
		];
		const recs = pickRecommendedModels({ hw: bigGpuBox, installed: [], catalog: sizeOnly });
		expect(recs.map((r) => r.model.id)).toContain("mystery");
	});

	it("breaks equal-fit ties by pull count, not raw size", () => {
		const tied: CatalogModel[] = [
			makeCatalogModel({
				id: "big-niche:14b",
				paramB: 14,
				sizeGb: 9,
				tags: ["chat"],
				pullCount: "50K",
			}),
			makeCatalogModel({
				id: "popular:8b",
				paramB: 8,
				sizeGb: 4.9,
				tags: ["chat"],
				pullCount: "120M",
			}),
		];
		const recs = pickRecommendedModels({ hw: bigGpuBox, installed: [], catalog: tied });
		const best = recs.find((r) => r.reason === "best-overall");
		expect(best?.model.id).toBe("popular:8b");
	});
});
