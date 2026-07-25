import type { CatalogModel, GpuInfo, HardwareInfo } from "#/shared/domain/model/types";

/**
 * Parses billions of parameters out of an HF repo id or size tag, e.g.
 * "Qwen3-8B", "gemma-3-4b-it", "Mixtral-8x7B" (→ 56), "gemma-3-270m" (→ 0.27).
 * Returns null when no size token is found.
 */
export function parseParamB(id: string): number | null {
	const moe = id.match(/(\d+(?:\.\d+)?)[xX](\d+(?:\.\d+)?)[bB](?:[-._]|$)/);
	if (moe?.[1] && moe[2]) return Number(moe[1]) * Number(moe[2]);

	const billions = id.match(/(?:^|[-._/])(\d+(?:\.\d+)?)[bB](?:[-._]|$)/);
	if (billions?.[1]) return Number(billions[1]);

	const millions = id.match(/(?:^|[-._/])(\d+(?:\.\d+)?)[mM](?:[-._]|$)/);
	if (millions?.[1]) return Number(millions[1]) / 1000;

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

/** Fallback GB-per-billion-parameters estimate, only used when a variant has no exact file size. */
const Q4_GB_PER_B_ESTIMATE = 0.6;

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * Memory needed to run a model: its exact GGUF file size (from the Hugging
 * Face repo tree) plus ~15% KV cache and ~1 GB runtime overhead. Falls back to
 * a param-count estimate only when the exact size wasn't fetched. Null when
 * neither size nor parameter count is known.
 */
export function requiredMemoryGb({
	sizeGb,
	paramB,
}: Pick<CatalogModel, "sizeGb" | "paramB">): number | null {
	const weightsGb = sizeGb ?? (paramB !== null ? round1(paramB * Q4_GB_PER_B_ESTIMATE) : null);
	if (weightsGb === null) return null;
	return round1(weightsGb * 1.15 + 1);
}

/**
 * Memory available to load a model into: the best GPU's free VRAM when a GPU is
 * detected (llama.cpp offloads there first), otherwise free system RAM.
 */
export function availableMemoryGb(hardware: HardwareInfo): number {
	const bestGpu = (hardware.gpus ?? []).reduce<GpuInfo | null>(
		(best, gpu) => (gpu.freeVramMb > (best?.freeVramMb ?? 0) ? gpu : best),
		null,
	);
	return bestGpu ? bestGpu.freeVramMb / 1024 : hardware.freeRamGb;
}

/** Whether a model's estimated memory need fits in the host's available memory. */
export function fitsHardware({
	model,
	hardware,
}: {
	model: Pick<CatalogModel, "sizeGb" | "paramB">;
	hardware: HardwareInfo;
}): boolean {
	const required = requiredMemoryGb(model);
	return required !== null && required <= availableMemoryGb(hardware);
}

/**
 * Builds the display tags for a catalog model: the raw capability badges plus
 * derived search hints ("fast" for small models, "code" for coding-focused ones).
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
