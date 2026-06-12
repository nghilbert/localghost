import { describe, expect, it } from "vitest";
import {
	pickRecommendedModels,
	recommendInstallVariant,
} from "#/features/cookbook/lib/recommendations";
import type { HardwareInfo, OllamaInstalledModel } from "#/features/cookbook/lib/types";

describe("recommendInstallVariant", () => {
	it("prefers a directly detected GPU vendor", () => {
		expect(
			recommendInstallVariant({
				gpus: [{ name: "RX 7900", vendor: "amd", totalVramMb: 20480, freeVramMb: 19000 }],
				nvidiaRuntime: false,
			}),
		).toBe("amd");
	});

	it("falls back to nvidia when only the container runtime is visible", () => {
		expect(recommendInstallVariant({ gpus: null, nvidiaRuntime: true })).toBe("nvidia");
	});

	it("recommends cpu when no GPU signal exists", () => {
		expect(recommendInstallVariant({ gpus: null, nvidiaRuntime: false })).toBe("cpu");
		expect(recommendInstallVariant({ gpus: [], nvidiaRuntime: false })).toBe("cpu");
	});
});

const bigGpuBox: HardwareInfo = {
	totalRamGb: 64,
	freeRamGb: 48,
	cpuModel: "Test CPU",
	cpuCount: 16,
	gpus: [{ name: "RTX 4090", vendor: "nvidia", totalVramMb: 24576, freeVramMb: 23000 }],
};

const cpuOnlyBox: HardwareInfo = {
	totalRamGb: 16,
	freeRamGb: 10,
	cpuModel: "Test CPU",
	cpuCount: 8,
	gpus: null,
};

const tinyBox: HardwareInfo = {
	totalRamGb: 2,
	freeRamGb: 1,
	cpuModel: "Test CPU",
	cpuCount: 2,
	gpus: null,
};

function installed(...names: string[]): OllamaInstalledModel[] {
	return names.map((name) => ({
		name,
		sizeBytes: 0,
		family: "",
		parameterSize: "",
		quantizationLevel: "",
	}));
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
