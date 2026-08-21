import type { HardwareFit } from "#/shared/domain/model/hardware-fit";
import { type HideableFit, hideableFitSchema } from "#/shared/domain/model/schemas";

/** The label shown for each fit band, shared by the row badge and the fit filter surfaces. */
export const FIT_LABELS: Record<HardwareFit, string> = {
	fits: "Runs on this machine",
	tight: "May be too large",
	"wont-fit": "Won't fit on this machine",
	unknown: "Size unknown",
};

/** The fit bands a user can hide, in filter-menu order (worst first). */
export const HIDEABLE_FITS: HideableFit[] = [...hideableFitSchema.options];
