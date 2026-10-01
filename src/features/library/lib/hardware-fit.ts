import type { StatusTone } from "#/components/layout/StatusBadge";
import { type HideableFit, hideableFitSchema } from "#/features/library/library.schemas";
import type { CatalogModel, GpuInfo, HardwareInfo } from "#/features/library/library.types";
import { GIB, MIB, roundToTenth } from "#/lib/format";

/** GB per billion parameters, used when a variant has no file size. */
const Q4_GB_PER_B_ESTIMATE = 0.6;

/** How well a model fits this machine. */
export type HardwareFit = "fits" | "tight" | "wont-fit" | "unknown";

/** The label for each fit level. */
export const FIT_LABELS: Record<HardwareFit, string> = {
	fits: "Fits this machine",
	tight: "May be too large",
	"wont-fit": "Won't fit",
	unknown: "Size unknown",
};

/** The status color for each fit level. */
export const FIT_TONES: Record<HardwareFit, StatusTone> = {
	fits: "success",
	tight: "warning",
	"wont-fit": "danger",
	unknown: "neutral",
};

/** The fit levels a user can hide, worst first. */
export const HIDEABLE_FITS: HideableFit[] = [...hideableFitSchema.options];

/** Estimated GB to run a model, including cache and overhead. Null when the size is unknown. */
export function requiredMemoryGb({
	sizeGb,
	paramB,
}: Pick<CatalogModel, "sizeGb" | "paramB">): number | null {
	const weightsGb =
		sizeGb ?? (paramB !== null ? roundToTenth(paramB * Q4_GB_PER_B_ESTIMATE) : null);
	if (weightsGb === null) return null;
	return roundToTenth(weightsGb * 1.15 + 1);
}

/** The GPU with the most free or total VRAM, or null without one. */
export function bestGpu({
	hardware,
	key,
}: {
	hardware: HardwareInfo;
	key: "freeVramMb" | "totalVramMb";
}): GpuInfo | null {
	return (hardware.gpus ?? []).reduce<GpuInfo | null>(
		(best, gpu) => (gpu[key] > (best?.[key] ?? 0) ? gpu : best),
		null,
	);
}

/** Free GB to load a model into: the best GPU's free VRAM, or free RAM without a GPU. */
export function availableMemoryGb(hardware: HardwareInfo): number {
	const gpu = bestGpu({ hardware, key: "freeVramMb" });
	return gpu ? (gpu.freeVramMb * MIB) / GIB : hardware.freeRamGb;
}

/** Total GB a model could ever use here: the best GPU's VRAM, or RAM without a GPU. */
export function totalMemoryGb(hardware: HardwareInfo): number {
	const gpu = bestGpu({ hardware, key: "totalVramMb" });
	return gpu ? (gpu.totalVramMb * MIB) / GIB : hardware.totalRamGb;
}

/**
 * How well a model needing `requiredGb` fits: `"fits"` in free memory now, `"tight"` only once
 * other models unload, `"wont-fit"` on this hardware at all, or `"unknown"` size. Null without
 * hardware info. Get `requiredGb` from {@link requiredMemoryGb}.
 */
export function classifyHardwareFit({
	requiredGb,
	hardware,
}: {
	requiredGb: number | null;
	hardware: HardwareInfo | undefined;
}): HardwareFit | null {
	if (!hardware) return null;
	if (requiredGb === null) return "unknown";
	if (requiredGb <= availableMemoryGb(hardware)) return "fits";
	return requiredGb <= totalMemoryGb(hardware) ? "tight" : "wont-fit";
}
