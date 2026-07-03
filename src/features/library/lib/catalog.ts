import type { CatalogModel, FitScore, HardwareInfo, ModelTagInfo } from "./types";

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
 * Parses the library's abbreviated pull count into a number for sorting/ranking.
 * Handles plain counts and K/M/B suffixes ("116.6M" → 116_600_000, "9.4K" → 9400).
 * Returns 0 when the value isn't parseable.
 */
export function parsePullCount(value: string): number {
	const match = value.trim().match(/^([\d.]+)\s*([kmb])?$/i);
	if (!match) return 0;
	const multiplier = { k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase() ?? ""] ?? 1;
	return Number(match[1]) * multiplier;
}

/** Q4 quantization weighs roughly this many GB per billion parameters. */
export const Q4_GB_PER_B = 0.6;

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * Memory needed to run a model at the default 8K context: real download size
 * (Q4 estimate from paramB otherwise) plus ~15% KV cache and ~1 GB runtime
 * overhead. Null when neither size nor parameter count is known.
 */
export function requiredMemoryGb({
	sizeGb,
	paramB,
}: Pick<CatalogModel, "sizeGb" | "paramB">): number | null {
	const weightsGb = sizeGb ?? (paramB !== null ? round1(paramB * Q4_GB_PER_B) : null);
	if (weightsGb === null) return null;
	return round1(weightsGb * 1.15 + 1);
}

/**
 * Merges tags-page data into a catalog entry: real size, context window, and a
 * paramB recovered via blob digest when the index row had none (`latest` shares
 * its digest with the size tag it aliases). Re-derives tags for "fast".
 */
export function enrichCatalogModel({
	model,
	tags,
}: {
	model: CatalogModel;
	tags: ModelTagInfo[];
}): CatalogModel {
	const colon = model.id.indexOf(":");
	const tagName = colon === -1 ? "latest" : model.id.slice(colon + 1);
	const info = tags.find((t) => t.tag === tagName);
	if (!info) return model;

	let paramB = model.paramB;
	if (paramB === null && info.digest) {
		const sibling = tags.find((t) => t.digest === info.digest && parseParamB(t.tag) !== null);
		if (sibling) paramB = parseParamB(sibling.tag);
	}

	return {
		...model,
		paramB,
		sizeGb: info.sizeGb ?? model.sizeGb,
		contextK: info.contextK ?? model.contextK,
		tags: deriveTags({
			name: model.name,
			description: model.description,
			paramB,
			capabilities: model.capabilities,
		}),
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

/**
 * Scores how a model runs on the detected hardware. Mirrors Ollama's layering:
 * fully in VRAM, split across VRAM and RAM (`gpu-partial`), or CPU-only.
 * Null when the model has no known size or parameter count.
 */
export function computeFit({
	model,
	hw,
}: {
	model: Pick<CatalogModel, "sizeGb" | "paramB">;
	hw: HardwareInfo;
}): FitScore | null {
	const requiredGb = requiredMemoryGb(model);
	if (requiredGb === null) return null;

	const bestGpu = hw.gpus?.reduce<NonNullable<typeof hw.gpus>[number] | null>(
		(best, g) => (g.totalVramMb > (best?.totalVramMb ?? 0) ? g : best),
		null,
	);
	const usableRamGb = hw.totalRamGb - 2;
	const cpuHeadroomGb = round1(usableRamGb - requiredGb);

	if (bestGpu) {
		const vramGb = bestGpu.totalVramMb / 1024;
		if (requiredGb <= vramGb) {
			const gpuHeadroomPct = Math.round(((vramGb - requiredGb) / vramGb) * 100);
			const tier = gpuHeadroomPct >= 20 ? "gpu-optimal" : "gpu-tight";
			const overall =
				tier === "gpu-optimal"
					? 90 + Math.min(10, Math.round(gpuHeadroomPct / 10))
					: 75 + Math.round(gpuHeadroomPct * 0.75);
			return { tier, gpuHeadroomPct, cpuHeadroomGb, overall };
		}
		if (requiredGb <= vramGb + usableRamGb) {
			// Scored by the fraction of the model living in VRAM: more offload, faster.
			const overall = Math.round(45 + 25 * (vramGb / requiredGb));
			return { tier: "gpu-partial", gpuHeadroomPct: null, cpuHeadroomGb, overall };
		}
		return tooLarge(cpuHeadroomGb);
	}

	if (requiredGb <= usableRamGb) {
		const overall = Math.round(40 + Math.min(30, cpuHeadroomGb * 2));
		return { tier: "cpu-only", gpuHeadroomPct: null, cpuHeadroomGb, overall };
	}
	return tooLarge(cpuHeadroomGb);
}

function tooLarge(cpuHeadroomGb: number): FitScore {
	return {
		tier: "too-large",
		gpuHeadroomPct: null,
		cpuHeadroomGb,
		overall: Math.max(0, Math.round(20 + cpuHeadroomGb * 2)),
	};
}
