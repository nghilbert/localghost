import {
	availableMemoryGb,
	requiredMemoryGb,
	totalMemoryGb,
} from "#/shared/domain/model/hardware-fit";
import type { CatalogModel, HardwareInfo, ModelVariantInfo } from "#/shared/domain/model/types";
import { formatBytes } from "#/shared/lib/format";

export type ModelVariantFit = "likely-fits" | "may-be-too-large" | "wont-fit" | "size-unknown";

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
	{ id: "wont-fit", label: "Won't fit" },
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
	if (estimatedMemoryGb <= availableMemoryGb(hardware)) return "likely-fits";
	return estimatedMemoryGb <= totalMemoryGb(hardware) ? "may-be-too-large" : "wont-fit";
}

/** Buckets options into hardware-fit groups, or a single "Variants" group when hardware is unknown. */
export function groupModelVariantOptions({
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
		groups: groupModelVariantOptions({ options, hardware }),
	};
}

/** One publisher offering quants of a model, e.g. `"unsloth"`. */
export type ModelAuthor = {
	/** The Hugging Face org/user that owns the repo. */
	name: string;
	/** A representative repo owned by this author, for reference. */
	repoId: string;
};

/** The org/user segment of a repo id, e.g. `"bartowski/Qwen_Qwen3-8B-GGUF"` → `"bartowski"`. */
export function authorOf(repoId: string): string {
	return repoId.split("/")[0] ?? repoId;
}

/**
 * The distinct publishers across a model's variant options, most-trusted first.
 * Follows the dedupe group's own trust order (`primaryRepoId`, then `siblingRepoIds`)
 * instead of re-ranking; unranked authors trail name-sorted. Defaults to the primary author.
 */
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

/** The options belonging to one author, in their existing (current-first, then size) order. */
export function optionsForAuthor({
	options,
	author,
}: {
	options: ModelVariantOption[];
	author: string;
}): ModelVariantOption[] {
	return options.filter((option) => authorOf(option.repoId) === author);
}

/** The variant to select by default for an author: its current quant, else its smallest. */
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
