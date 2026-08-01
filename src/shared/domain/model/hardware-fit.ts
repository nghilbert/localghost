import type { CatalogModel, GpuInfo, HardwareInfo } from "#/shared/domain/model/types";

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

/**
 * This machine's total memory ceiling for a model: the best GPU's total VRAM when a
 * GPU is detected, otherwise total system RAM. Unlike `availableMemoryGb`, this ignores
 * what's currently loaded — it answers "could this ever fit here," not "does it fit now."
 */
export function totalMemoryGb(hardware: HardwareInfo): number {
	const bestGpu = (hardware.gpus ?? []).reduce<GpuInfo | null>(
		(best, gpu) => (gpu.totalVramMb > (best?.totalVramMb ?? 0) ? gpu : best),
		null,
	);
	return bestGpu ? bestGpu.totalVramMb / 1024 : hardware.totalRamGb;
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

export type HardwareFit = "fits" | "tight" | "wont-fit" | "unknown";

/**
 * The fit classification shown on a catalog row or variant option: `"fits"` (fits in
 * memory free right now), `"tight"` (exceeds what's free but fits this machine's total
 * capacity — possible once something else frees memory), `"wont-fit"` (exceeds total
 * capacity, never possible on this hardware), or `"unknown"` (size can't be estimated).
 */
export function classifyHardwareFit({
	model,
	hardware,
}: {
	model: Pick<CatalogModel, "sizeGb" | "paramB">;
	hardware: HardwareInfo | undefined;
}): HardwareFit | null {
	if (!hardware) return null;
	const required = requiredMemoryGb(model);
	if (required === null) return "unknown";
	if (required <= availableMemoryGb(hardware)) return "fits";
	return required <= totalMemoryGb(hardware) ? "tight" : "wont-fit";
}
