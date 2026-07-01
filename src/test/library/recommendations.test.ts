import { describe, expect, it } from "vitest";
import { pickRecommendedModels } from "#/features/library/lib/recommendations";
import type { CatalogModel } from "#/features/library/lib/types";
import { makeCatalogModel, makeGpu, makeHardware, makeInstalledModel } from "#/test/factories";

const catalog: CatalogModel[] = [
	makeCatalogModel({ id: "gemma3:1b", paramB: 1, vramGb: 0.7, ramGb: 1.2, tags: ["fast"] }),
	makeCatalogModel({ id: "llama3.1:8b", paramB: 8, vramGb: 5.2, ramGb: 9.2, tags: ["chat"] }),
	makeCatalogModel({ id: "qwen2.5:32b", paramB: 32, vramGb: 20.8, ramGb: 36.8, tags: ["chat"] }),
	makeCatalogModel({ id: "qwen2.5-coder:7b", paramB: 7, vramGb: 4.6, ramGb: 8, tags: ["code"] }),
	makeCatalogModel({
		id: "nomic-embed-text",
		paramB: 0.1,
		vramGb: 0.1,
		ramGb: 0.2,
		tags: ["embedding"],
	}),
	makeCatalogModel({ id: "llama3.1:405b", paramB: 405, vramGb: 263, ramGb: 466, tags: ["chat"] }),
	makeCatalogModel({ id: "weird:latest", paramB: null, vramGb: 0, ramGb: 0, tags: [] }),
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

	it("never recommends embedding models, unparseable sizes, or non-fitting models", () => {
		for (const hw of [bigGpuBox, cpuOnlyBox, tinyBox]) {
			for (const { model, fit } of pick(hw)) {
				expect(model.tags).not.toContain("embedding");
				expect(model.paramB).not.toBeNull();
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
});
