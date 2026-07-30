import { availableMemoryGb, requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import type { CatalogModel, HardwareInfo, ModelVariantInfo } from "#/shared/domain/model/types";
import { formatBytes } from "#/shared/lib/format";

export type ModelVariantFit = "likely-fits" | "may-be-too-large" | "size-unknown";

export type ModelVariantOption = {
	quant: string;
	modelId: string;
	sizeGb: number | null;
	contextK: number | null;
	estimatedMemoryGb: number | null;
	fit: ModelVariantFit | null;
	isCurrent: boolean;
	/** The Hugging Face repo this quant actually lives in. */
	repoId: string;
	/** False when this quant was merged in from a different (losing dedupe) repo. */
	isSameRepoAsPrimary: boolean;
};

export type ModelVariantGroupId = ModelVariantFit | "variants";

export type ModelVariantGroup = {
	id: ModelVariantGroupId;
	label: string;
	options: ModelVariantOption[];
};

export type ModelVariants = {
	/** The default selection: a specific repo+quant pair, since the same quant can come from more than one publisher. */
	initialModelId: string;
	options: ModelVariantOption[];
	groups: ModelVariantGroup[];
};

const HARDWARE_GROUPS: { id: ModelVariantFit; label: string }[] = [
	{ id: "likely-fits", label: "Likely fits" },
	{ id: "may-be-too-large", label: "May be too large" },
	{ id: "size-unknown", label: "Size unknown" },
];

/**
 * The exact repo+quant a catalog row pins, e.g. `{ repoId: "ggml-org/gemma-3-4b-it-GGUF", quant: "Q4_K_M" }`.
 * Two publishers can share a quant name, so matching quant alone would mark both "current".
 */
function catalogVariantKey(catalog: CatalogModel): { repoId: string; quant: string } {
	const colon = catalog.id.lastIndexOf(":");
	return colon === -1
		? { repoId: catalog.id, quant: "latest" }
		: { repoId: catalog.id.slice(0, colon), quant: catalog.id.slice(colon + 1) };
}

function sourceVariants({
	catalog,
	currentQuant,
	variants,
}: {
	catalog: CatalogModel;
	currentQuant: string;
	variants: ModelVariantInfo[] | undefined;
}): ModelVariantInfo[] {
	if (variants && variants.length > 0) return variants;
	if (catalog.variants && catalog.variants.length > 0) return catalog.variants;
	return [{ quant: currentQuant, sizeGb: catalog.sizeGb, fileName: "", repoId: catalog.name }];
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
	if (option.sizeGb !== null) details.push(`${formatBytes(option.sizeGb * 1e9)} download`);
	if (option.contextK !== null) details.push(`${option.contextK}K context`);
	if (option.estimatedMemoryGb !== null) {
		details.push(`~${formatBytes(option.estimatedMemoryGb * 1e9)} memory`);
	}
	return details.length > 0 ? details.join(" · ") : "Details unavailable";
}

/** Builds the ordered variant choices and their hardware-fit groups for one catalog row. */
export function buildModelVariants({
	catalog,
	hardware,
	variants,
}: {
	catalog: CatalogModel;
	hardware: HardwareInfo | undefined;
	/** A lazily-fetched cross-publisher variant list, preferred over `catalog.variants` when present. */
	variants?: ModelVariantInfo[];
}): ModelVariants {
	const current = catalogVariantKey(catalog);
	const options = sourceVariants({ catalog, currentQuant: current.quant, variants })
		.map<ModelVariantOption>((variant) => {
			const isCurrent = variant.repoId === current.repoId && variant.quant === current.quant;
			const sizeGb = variant.sizeGb ?? (isCurrent ? catalog.sizeGb : null);
			const estimatedMemoryGb = requiredMemoryGb({ sizeGb, paramB: catalog.paramB });
			return {
				quant: variant.quant,
				modelId: `${variant.repoId}:${variant.quant}`,
				sizeGb,
				contextK: isCurrent ? catalog.contextK : null,
				estimatedMemoryGb,
				fit: variantFit({ estimatedMemoryGb, hardware }),
				isCurrent,
				repoId: variant.repoId,
				isSameRepoAsPrimary: variant.repoId === catalog.name,
			};
		})
		.sort((left, right) => compareOptions({ left, right }));

	return {
		initialModelId:
			options.find((option) => option.isCurrent)?.modelId ??
			options[0]?.modelId ??
			`${current.repoId}:${current.quant}`,
		options,
		groups: groupOptions({ options, hardware }),
	};
}
