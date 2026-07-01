import type { FitScore, HardwareInfo } from "./types";

/**
 * Parses billions of parameters from an Ollama size tag. Handles plain sizes
 * ("8b", "1.5b", "0.5b"), million-scale ("270m", "137m"), and mixture-of-experts
 * naming ("8x7b" → 56). Returns null when the tag isn't a parseable size.
 */
export function parseParamB(size: string): number | null {
	const tag = size.trim().toLowerCase();

	const moe = tag.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)b$/);
	if (moe) return Number(moe[1]) * Number(moe[2]);

	const billions = tag.match(/^(\d+(?:\.\d+)?)b$/);
	if (billions) return Number(billions[1]);

	const millions = tag.match(/^(\d+(?:\.\d+)?)m$/);
	if (millions) return Number(millions[1]) / 1000;

	return null;
}

/**
 * Estimates a Q4-ish memory footprint from parameter count. The library doesn't
 * publish VRAM/RAM, so we approximate: the ratios below match the previously
 * hand-tuned catalog closely (weights at ~0.65 GB/B, plus CPU overhead).
 */
export function estimateFootprint({ paramB }: { paramB: number }): {
	vramGb: number;
	ramGb: number;
} {
	return {
		vramGb: Math.round(paramB * 0.65 * 10) / 10,
		ramGb: Math.round(paramB * 1.15 * 10) / 10,
	};
}

/**
 * Builds the display tags for a catalog model: the raw capability badges plus
 * derived hints the recommender relies on ("fast" for small models, "code" for
 * coding-focused ones).
 */
export function deriveTags({
	name,
	description,
	paramB,
	capabilities,
}: {
	name: string;
	description: string;
	paramB: number | null;
	capabilities: string[];
}): string[] {
	const tags = [...capabilities];
	if (paramB !== null && paramB <= 3) tags.push("fast");
	if (/cod(e|er)/i.test(`${name} ${description}`)) tags.push("code");
	return tags;
}

export function computeFit({
	model,
	hw,
}: {
	model: { vramGb: number; ramGb: number };
	hw: HardwareInfo;
}): FitScore {
	const vramNeededMb = model.vramGb * 1024;
	const bestGpu = hw.gpus?.reduce<NonNullable<typeof hw.gpus>[number] | null>(
		(best, g) => (g.totalVramMb > (best?.totalVramMb ?? 0) ? g : best),
		null,
	);

	let gpuHeadroomPct: number | null = null;
	let tier: FitScore["tier"];

	if (bestGpu && bestGpu.totalVramMb >= vramNeededMb) {
		gpuHeadroomPct = Math.round(((bestGpu.totalVramMb - vramNeededMb) / bestGpu.totalVramMb) * 100);
		tier = gpuHeadroomPct >= 20 ? "gpu-optimal" : "gpu-tight";
	} else {
		const cpuRamNeeded = model.ramGb;
		const usableRamGb = hw.totalRamGb - 2;
		const cpuHeadroomGb = usableRamGb - cpuRamNeeded;
		if (cpuHeadroomGb >= 0) {
			tier = "cpu-only";
		} else {
			tier = "too-large";
		}
	}

	const cpuHeadroomGb = Math.max(0, hw.totalRamGb - 2 - model.ramGb);

	let overall: number;
	if (tier === "gpu-optimal") overall = 90 + Math.min(10, gpuHeadroomPct ?? 0) / 10;
	else if (tier === "gpu-tight") overall = 70 + Math.max(0, (gpuHeadroomPct ?? 0) / 2);
	else if (tier === "cpu-only") overall = 40 + Math.min(30, cpuHeadroomGb * 2);
	else overall = Math.max(0, 20 - Math.abs(cpuHeadroomGb) * 2);

	return { tier, gpuHeadroomPct, cpuHeadroomGb, overall: Math.round(overall) };
}
