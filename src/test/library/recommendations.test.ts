import { describe, expect, it } from "vitest";
import { pickRecommendedModels } from "#/features/library/lib/recommendations";
import { makeGpu, makeHardware, makeInstalledModel } from "#/test/factories";

const bigGpuBox = makeHardware({
	totalRamGb: 64,
	freeRamGb: 48,
	gpus: [makeGpu({ totalVramMb: 24576, freeVramMb: 23000 })],
});

const cpuOnlyBox = makeHardware({ totalRamGb: 16, freeRamGb: 10, cpuCount: 8 });

const tinyBox = makeHardware({ totalRamGb: 2, freeRamGb: 1, cpuCount: 2 });

function installed(...names: string[]) {
	return names.map((name) => makeInstalledModel({ name }));
}

describe("pickRecommendedModels", () => {
	it("returns at most three deduped recommendations with distinct reasons", () => {
		const recommendations = pickRecommendedModels(bigGpuBox, []);
		expect(recommendations.length).toBeGreaterThan(0);
		expect(recommendations.length).toBeLessThanOrEqual(3);
		const ids = recommendations.map((r) => r.model.id);
		expect(new Set(ids).size).toBe(ids.length);
		const reasons = recommendations.map((r) => r.reason);
		expect(new Set(reasons).size).toBe(reasons.length);
	});

	it("never recommends embedding models or models that do not fit", () => {
		for (const hw of [bigGpuBox, cpuOnlyBox, tinyBox]) {
			for (const { model, fit } of pickRecommendedModels(hw, [])) {
				expect(model.tags).not.toContain("embedding");
				expect(fit.tier).not.toBe("too-large");
			}
		}
	});

	it("prefers larger models on capable gpu hardware for best-overall", () => {
		const best = pickRecommendedModels(bigGpuBox, []).find((r) => r.reason === "best-overall");
		expect(best).toBeDefined();
		expect(best?.model.paramB).toBeGreaterThanOrEqual(14);
		expect(best?.fit.tier).toBe("gpu-optimal");
	});

	it("picks a small model as fastest", () => {
		const fastest = pickRecommendedModels(bigGpuBox, []).find((r) => r.reason === "fastest");
		expect(fastest).toBeDefined();
		expect(fastest?.model.paramB).toBeLessThanOrEqual(3);
	});

	it("picks a code-tagged model for best-coding", () => {
		const coding = pickRecommendedModels(bigGpuBox, []).find((r) => r.reason === "best-coding");
		expect(coding?.model.tags).toContain("code");
	});

	it("excludes installed models, including :latest-suffixed names", () => {
		const baseline = pickRecommendedModels(cpuOnlyBox, []);
		const fastestId = baseline.find((r) => r.reason === "fastest")?.model.id;
		expect(fastestId).toBeDefined();
		const next = pickRecommendedModels(
			cpuOnlyBox,
			installed(`${fastestId}:latest`, fastestId ?? ""),
		);
		expect(next.map((r) => r.model.id)).not.toContain(fastestId);
	});

	it("still recommends something on cpu-only hardware", () => {
		const recommendations = pickRecommendedModels(cpuOnlyBox, []);
		expect(recommendations.length).toBeGreaterThan(0);
		for (const { fit } of recommendations) {
			expect(fit.tier).toBe("cpu-only");
		}
	});

	it("returns few or no fits on tiny hardware without crashing", () => {
		const recommendations = pickRecommendedModels(tinyBox, []);
		for (const { fit } of recommendations) {
			expect(fit.tier).not.toBe("too-large");
		}
	});
});
