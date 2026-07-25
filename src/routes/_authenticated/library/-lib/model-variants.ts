import type { CatalogModel, HardwareInfo, ModelVariantInfo } from "#/shared/domain/model/types";
import { availableMemoryGb, requiredMemoryGb } from "./catalog";

export type ModelVariantFit = "likely-fits" | "may-be-too-large" | "size-unknown";

export type ModelVariantOption = {
	quant: string;
	modelId: string;
	sizeGb: number | null;
	contextK: number | null;
	estimatedMemoryGb: number | null;
	fit: ModelVariantFit | null;
	isCurrent: boolean;
};

export type ModelVariantGroupId = ModelVariantFit | "variants";

export type ModelVariantGroup = {
	id: ModelVariantGroupId;
	label: string;
	options: ModelVariantOption[];
};

export type ModelVariants = {
	initialQuant: string;
	options: ModelVariantOption[];
	groups: ModelVariantGroup[];
};

const HARDWARE_GROUPS: { id: ModelVariantFit; label: string }[] = [
	{ id: "likely-fits", label: "Likely fits" },
	{ id: "may-be-too-large", label: "May be too large" },
	{ id: "size-unknown", label: "Size unknown" },
];

/** The quant a catalog row pins, e.g. "Q4_K_M" for `ggml-org/gemma-3-4b-it-GGUF:Q4_K_M`. */
function catalogQuant(catalog: CatalogModel): string {
	const colon = catalog.id.lastIndexOf(":");
	return colon === -1 ? "latest" : catalog.id.slice(colon + 1);
}

function sourceVariants({
	catalog,
	currentQuant,
}: {
	catalog: CatalogModel;
	currentQuant: string;
}): ModelVariantInfo[] {
	if (catalog.variants && catalog.variants.length > 0) return catalog.variants;
	return [{ quant: currentQuant, sizeGb: catalog.sizeGb, fileName: "" }];
}

function compareOptions({
	left,
	right,
}: {
	left: ModelVariantOption;
	right: ModelVariantOption;
}): number {
	if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1;
	if (left.sizeGb !== right.sizeGb) {
		if (left.sizeGb === null) return 1;
		if (right.sizeGb === null) return -1;
		return left.sizeGb - right.sizeGb;
	}
	return left.quant.localeCompare(right.quant, undefined, { numeric: true });
}

function variantFit({
	estimatedMemoryGb,
	hardware,
}: {
	estimatedMemoryGb: number | null;
	hardware: HardwareInfo | undefined;
}): ModelVariantFit | null {
	if (!hardware) return null;
	if (estimatedMemoryGb === null) return "size-unknown";
	return estimatedMemoryGb <= availableMemoryGb(hardware) ? "likely-fits" : "may-be-too-large";
}

function groupOptions({
	options,
	hardware,
}: {
	options: ModelVariantOption[];
	hardware: HardwareInfo | undefined;
}): ModelVariantGroup[] {
	if (!hardware) return [{ id: "variants", label: "Variants", options }];

	return HARDWARE_GROUPS.flatMap((group) => {
		const matching = options.filter((option) => option.fit === group.id);
		return matching.length > 0 ? [{ ...group, options: matching }] : [];
	});
}

/** Formats a variant's known download, context, and memory facts. */
export function formatModelVariantDetails(option: ModelVariantOption): string {
	const details: string[] = [];
	if (option.sizeGb !== null) details.push(`${option.sizeGb} GB download`);
	if (option.contextK !== null) details.push(`${option.contextK}K context`);
	if (option.estimatedMemoryGb !== null) details.push(`~${option.estimatedMemoryGb} GB memory`);
	return details.length > 0 ? details.join(" · ") : "Details unavailable";
}

/** Builds the ordered variant choices and their hardware-fit groups for one catalog row. */
export function buildModelVariants({
	catalog,
	hardware,
}: {
	catalog: CatalogModel;
	hardware: HardwareInfo | undefined;
}): ModelVariants {
	const currentQuant = catalogQuant(catalog);
	const options = sourceVariants({ catalog, currentQuant })
		.map<ModelVariantOption>((variant) => {
			const isCurrent = variant.quant === currentQuant;
			const sizeGb = variant.sizeGb ?? (isCurrent ? catalog.sizeGb : null);
			const estimatedMemoryGb = requiredMemoryGb({ sizeGb, paramB: catalog.paramB });
			return {
				quant: variant.quant,
				modelId: `${catalog.name}:${variant.quant}`,
				sizeGb,
				contextK: isCurrent ? catalog.contextK : null,
				estimatedMemoryGb,
				fit: variantFit({ estimatedMemoryGb, hardware }),
				isCurrent,
			};
		})
		.sort((left, right) => compareOptions({ left, right }));

	return {
		initialQuant:
			options.find((option) => option.isCurrent)?.quant ?? options[0]?.quant ?? currentQuant,
		options,
		groups: groupOptions({ options, hardware }),
	};
}
