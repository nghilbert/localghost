import type { CatalogModel, GpuInfo, HardwareInfo } from "#/shared/domain/model/types";

/** Formats a raw Hugging Face download count for display, e.g. 4983180 → "5.0M". */
export function formatPullCount(value: number): string {
	if (value >= 1e9) return `${round1(value / 1e9)}B`;
	if (value >= 1e6) return `${round1(value / 1e6)}M`;
	if (value >= 1e3) return `${round1(value / 1e3)}K`;
	return String(value);
}

/** Fallback GB-per-billion-parameters estimate, only used when a variant has no exact file size. */
const Q4_GB_PER_B_ESTIMATE = 0.6;

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Estimates model memory from exact size or a parameter-count fallback.
 * Includes KV cache and runtime overhead; returns null when size is unknown.
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
