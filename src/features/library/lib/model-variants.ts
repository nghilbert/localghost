import type {
	CatalogModel,
	HardwareInfo,
	ModelVariantInfo,
} from "#/features/library/library.types";
import { formatBytes, GIB } from "#/lib/format";
import {
	classifyHardwareFit,
	FIT_LABELS,
	type HardwareFit,
	requiredMemoryGb,
} from "./hardware-fit";

/** One quant a user can pick. */
export type ModelVariantOption = {
	quant: string;
	modelId: string;
	sizeGb: number | null;
	contextK: number | null;
	estimatedMemoryGb: number | null;
	fit: HardwareFit | null;
	isCurrent: boolean;
	/** The Hugging Face repo holding this quant. */
	repoId: string;
	/** False when this quant comes from another repo of the same model. */
	isSameRepoAsPrimary: boolean;
};

/** A group of quants: a fit level, or all of them when the hardware is unknown. */
export type ModelVariantGroupId = HardwareFit | "variants";

/** Quants grouped under one label. */
type ModelVariantGroup = {
	id: ModelVariantGroupId;
	label: string;
	options: ModelVariantOption[];
};

/** A model's quant choices, their groups, and the default. */
type ModelVariants = {
	/** The model id selected by default. It names a repo too, since publishers share quant names. */
	initialModelId: string;
	options: ModelVariantOption[];
	groups: ModelVariantGroup[];
};

// Best fit first.
const FIT_GROUP_ORDER: HardwareFit[] = ["fits", "tight", "wont-fit", "unknown"];

/** The repo and quant a catalog row stands for. Both are needed, since publishers share quant names. */
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

/** Groups quants by hardware fit, or into one group when the hardware is unknown. */
export function groupModelVariantOptions({
	options,
	hardware,
}: {
	options: ModelVariantOption[];
	hardware: HardwareInfo | undefined;
}): ModelVariantGroup[] {
	if (!hardware) return [{ id: "variants", label: "Variants", options }];

	return FIT_GROUP_ORDER.flatMap((fit) => {
		const matching = options.filter((option) => option.fit === fit);
		return matching.length > 0 ? [{ id: fit, label: FIT_LABELS[fit], options: matching }] : [];
	});
}

/** A quant's size, context, and memory, as far as they are known. */
export function formatModelVariantDetails(option: ModelVariantOption): string {
	const details: string[] = [];
	if (option.sizeGb !== null) details.push(`${formatBytes(option.sizeGb * GIB)} download`);
	if (option.contextK !== null) details.push(`${option.contextK}K context`);
	if (option.estimatedMemoryGb !== null) {
		details.push(`~${formatBytes(option.estimatedMemoryGb * GIB)} memory`);
	}
	return details.length > 0 ? details.join(" · ") : "Details unavailable";
}

/** A catalog row's quant choices, ordered and grouped by hardware fit. */
export function buildModelVariants({
	catalog,
	hardware,
	variants,
}: {
	catalog: CatalogModel;
	hardware: HardwareInfo | undefined;
	/** Every quant from all of the model's repos, used over `catalog.variants` once loaded. */
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
				fit: classifyHardwareFit({ requiredGb: estimatedMemoryGb, hardware }),
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
		groups: groupModelVariantOptions({ options, hardware }),
	};
}

/** One publisher offering quants of a model, e.g. `"unsloth"`. */
type ModelAuthor = {
	/** The Hugging Face user or org. */
	name: string;
	/** One of this publisher's repos for the model. */
	repoId: string;
};

/** The publisher in a repo id, e.g. `"bartowski"` from `"bartowski/Qwen_Qwen3-8B-GGUF"`. */
function authorOf(repoId: string): string {
	return repoId.split("/")[0] ?? repoId;
}

/** The publishers of a model's quants, in the catalog's order, then others by name. */
export function buildModelAuthors({
	options,
	primaryRepoId,
	siblingRepoIds,
}: {
	options: ModelVariantOption[];
	primaryRepoId: string;
	siblingRepoIds: string[];
}): { authors: ModelAuthor[]; defaultAuthor: string } {
	const byName = new Map<string, ModelAuthor>();
	for (const option of options) {
		const name = authorOf(option.repoId);
		if (!byName.has(name)) byName.set(name, { name, repoId: option.repoId });
	}

	const authors: ModelAuthor[] = [];
	const added = new Set<string>();
	const append = (name: string) => {
		const author = byName.get(name);
		if (author && !added.has(name)) {
			added.add(name);
			authors.push(author);
		}
	};
	for (const repoId of [primaryRepoId, ...siblingRepoIds]) append(authorOf(repoId));
	for (const name of [...byName.keys()].sort()) append(name);

	const primaryAuthor = authorOf(primaryRepoId);
	const defaultAuthor = byName.has(primaryAuthor)
		? primaryAuthor
		: (authors[0]?.name ?? primaryAuthor);
	return { authors, defaultAuthor };
}

/** One publisher's quants, in their existing order. */
export function optionsForAuthor({
	options,
	author,
}: {
	options: ModelVariantOption[];
	author: string;
}): ModelVariantOption[] {
	return options.filter((option) => authorOf(option.repoId) === author);
}

/** The quant selected by default for a publisher: its current one, else its smallest. */
export function defaultOptionForAuthor({
	options,
	author,
}: {
	options: ModelVariantOption[];
	author: string;
}): ModelVariantOption | undefined {
	const forAuthor = optionsForAuthor({ options, author });
	return forAuthor.find((option) => option.isCurrent) ?? forAuthor[0];
}
