import type { CatalogModel, HardwareInfo, ModelTagInfo } from "#/shared/domain/model/types";
import { availableMemoryGb, requiredMemoryGb } from "./catalog";

export type ModelVariantFit = "likely-fits" | "may-be-too-large" | "size-unknown";

export type ModelVariantOption = {
	tag: string;
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
	initialTag: string;
	options: ModelVariantOption[];
	groups: ModelVariantGroup[];
};

const HARDWARE_GROUPS: { id: ModelVariantFit; label: string }[] = [
	{ id: "likely-fits", label: "Likely fits" },
	{ id: "may-be-too-large", label: "May be too large" },
	{ id: "size-unknown", label: "Size unknown" },
];

/** The tag a catalog row pins, e.g. "8b" for `llama3.1:8b`; a bare id means `latest`. */
function catalogTag(catalog: CatalogModel): { isBare: boolean; tag: string } {
	const colon = catalog.id.indexOf(":");
	if (colon === -1) return { isBare: true, tag: "latest" };
	return { isBare: false, tag: catalog.id.slice(colon + 1) || "latest" };
}

function sourceVariants({
	catalog,
	currentTag,
}: {
	catalog: CatalogModel;
	currentTag: string;
}): ModelTagInfo[] {
	if (!catalog.variants || catalog.variants.length === 0) {
		return [{ tag: currentTag, digest: null, sizeGb: catalog.sizeGb, contextK: catalog.contextK }];
	}
	const byTag = new Map<string, ModelTagInfo>();
	for (const variant of catalog.variants) {
		if (!byTag.has(variant.tag)) byTag.set(variant.tag, variant);
	}
	return [...byTag.values()];
}

/**
 * A catalog row is one model size, so its picker offers that size only: the row's own tag plus
 * its quantization variants (`8b`, `8b-q4_K_M`, …). A bare id pins no size, so it offers all tags,
 * as does a row whose tag the scrape never saw (scoping to it would leave nothing to pick).
 */
function scopedVariants({
	variants,
	currentTag,
	isBare,
}: {
	variants: ModelTagInfo[];
	currentTag: string;
	isBare: boolean;
}): ModelTagInfo[] {
	if (isBare || !variants.some((variant) => variant.tag === currentTag)) return variants;
	return variants.filter(
		(variant) => variant.tag === currentTag || variant.tag.startsWith(`${currentTag}-`),
	);
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
	return left.tag.localeCompare(right.tag, undefined, { numeric: true });
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
	const { tag: currentTag, isBare } = catalogTag(catalog);
	const options = scopedVariants({
		variants: sourceVariants({ catalog, currentTag }),
		currentTag,
		isBare,
	})
		.map<ModelVariantOption>((variant) => {
			const isCurrent = variant.tag === currentTag;
			const sizeGb = variant.sizeGb ?? (isCurrent ? catalog.sizeGb : null);
			const estimatedMemoryGb = requiredMemoryGb({ sizeGb, paramB: catalog.paramB });
			return {
				tag: variant.tag,
				modelId: `${catalog.name}:${variant.tag}`,
				sizeGb,
				contextK: variant.contextK ?? (isCurrent ? catalog.contextK : null),
				estimatedMemoryGb,
				fit: variantFit({ estimatedMemoryGb, hardware }),
				isCurrent,
			};
		})
		.sort((left, right) => compareOptions({ left, right }));

	return {
		initialTag: options.find((option) => option.isCurrent)?.tag ?? options[0]?.tag ?? currentTag,
		options,
		groups: groupOptions({ options, hardware }),
	};
}
