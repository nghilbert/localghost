import { findNearestQuantType, GGMLFileQuantizationType } from "@huggingface/gguf";
import type { CatalogModel, ModelVariantInfo } from "#/features/library/library.types";
import { BILLION, roundToTenth } from "#/lib/format";

/** Capability and search tags for a catalog model. */
export function deriveTags({
	name,
	paramB,
	capabilities,
}: {
	name: string;
	paramB: number | null;
	capabilities: string[];
}): string[] {
	const tags = [...capabilities];
	if (paramB !== null && paramB <= 3) tags.push("fast");
	if (name.toLowerCase().includes("code")) tags.push("code");
	return tags;
}

/** Quant label to enum value, from the enum's own entries. */
const QUANT_LABEL_TO_TYPE = new Map<string, GGMLFileQuantizationType>(
	Object.entries(GGMLFileQuantizationType).filter(
		(entry): entry is [string, GGMLFileQuantizationType] => typeof entry[1] === "number",
	),
);

/** The enum value for a quant label such as `"Q4_K_M"` or unsloth's `"UD-Q4_K_XL"`. */
function quantTypeFromLabel(quant: string): GGMLFileQuantizationType | undefined {
	const key = quant.startsWith("UD-") ? quant.slice("UD-".length) : quant;
	return QUANT_LABEL_TO_TYPE.get(key);
}

/** The default quant, a good balance of quality and size. */
const DEFAULT_QUANT_TARGET = GGMLFileQuantizationType.Q4_K_M;

/**
 * The variant to install by default: the quant nearest {@link DEFAULT_QUANT_TARGET}, or the
 * smallest file when no label is a known quant.
 */
export function pickDefaultVariant(variants: ModelVariantInfo[]): ModelVariantInfo | null {
	if (variants.length === 0) return null;

	const typed = variants.flatMap((variant) => {
		const quantType = quantTypeFromLabel(variant.quant);
		return quantType === undefined ? [] : [{ variant, quantType }];
	});
	if (typed.length > 0) {
		const nearest = findNearestQuantType(
			DEFAULT_QUANT_TARGET,
			typed.map((entry) => entry.quantType),
		);
		const match = typed.find((entry) => entry.quantType === nearest);
		if (match) return match.variant;
	}

	return variants.reduce((smallest, v) =>
		(v.sizeGb ?? Number.POSITIVE_INFINITY) < (smallest.sizeGb ?? Number.POSITIVE_INFINITY)
			? v
			: smallest,
	);
}

/** Publisher preference when grouping repos of one model, lowest first. Others rank last. */
const PUBLISHER_RANK: Record<string, number> = {
	"ggml-org": 0,
	google: 1,
	Qwen: 1,
	"meta-llama": 1,
	mistralai: 1,
	microsoft: 1,
	"lmstudio-community": 2,
	unsloth: 2,
	bartowski: 2,
	MaziyarPanahi: 3,
	mradermacher: 3,
};

function publisherRank(repoId: string): number {
	const publisher = repoId.split("/")[0] ?? "";
	return PUBLISHER_RANK[publisher] ?? 4;
}

/** Packaging suffixes ignored when grouping. Fine-tune markers stay, since they name different models. */
const REPACK_SUFFIXES = ["-gguf", "-it", "-instruct"];

/**
 * The key that groups every repack of one model: the Hub's `baseModels` link when the repo
 * sets it, else {@link baseModelKey}.
 */
export function groupKey({
	repoId,
	baseModelIds,
}: {
	repoId: string;
	baseModelIds: string[];
}): string {
	const base = baseModelIds[0];
	return base ? base.toLowerCase() : baseModelKey(repoId);
}

/** Billions of parameters from the Hub's `gguf.total`, rounded for display. */
export function paramBFromTotal(total: number | undefined): number | null {
	if (total === undefined || total <= 0) return null;
	const billions = total / BILLION;
	return billions >= 10 ? Math.round(billions) : roundToTenth(billions);
}

/** Context window in thousands of tokens from the Hub's `gguf.context_length`. */
export function contextKFromLength(contextLength: number | undefined): number | null {
	if (contextLength === undefined || contextLength <= 0) return null;
	return Math.round(contextLength / 1024);
}

/** A repo id reduced to its model name, so repacks by different publishers match. */
export function baseModelKey(repoId: string): string {
	const name = (repoId.split("/")[1] ?? repoId).toLowerCase();
	let key = name;
	let changed = true;
	while (changed) {
		changed = false;
		for (const suffix of REPACK_SUFFIXES) {
			if (key.endsWith(suffix)) {
				key = key.slice(0, -suffix.length);
				changed = true;
			}
		}
	}
	return key;
}

/** A readable name from a repo id, e.g. "unsloth/Qwen3.5-4B-GGUF" becomes "Qwen3.5 4B". */
export function deriveDisplayName(repoId: string): string {
	const name = repoId.split("/")[1] ?? repoId;
	const words = name
		.split(/[-_]/)
		.filter((word) => word.length > 0)
		.filter((word) => !REPACK_SUFFIXES.includes(`-${word.toLowerCase()}`))
		.filter((word) => word.toLowerCase() !== "gguf");
	return words
		.map((word) => {
			const first = word.charAt(0);
			if (first >= "0" && first <= "9") return word.toUpperCase();
			return first.toUpperCase() + word.slice(1);
		})
		.join(" ");
}

/** A catalog repo before grouping. */
export type CatalogCandidate = Pick<
	CatalogModel,
	| "name"
	| "paramB"
	| "capabilities"
	| "updatedAt"
	| "author"
	| "license"
	| "likes"
	| "createdAt"
	| "contextK"
> & {
	pullCount: number;
	variants: ModelVariantInfo[];
	/** Repos this one derives from, per the Hub's `baseModels` link. */
	baseModelIds: string[];
	/** The other repos grouped into this one. Empty before grouping. */
	siblingRepoIds: string[];
};

/**
 * Groups repacks of the same model into one entry. The preferred publisher supplies the
 * metadata, and every repo's files are kept, so the same quant from two publishers stays selectable.
 */
export function dedupeByBaseModel(candidates: CatalogCandidate[]): CatalogCandidate[] {
	const groups = new Map<string, CatalogCandidate[]>();
	for (const candidate of candidates) {
		const key = groupKey({ repoId: candidate.name, baseModelIds: candidate.baseModelIds });
		const group = groups.get(key);
		if (group) group.push(candidate);
		else groups.set(key, [candidate]);
	}

	const merged: CatalogCandidate[] = [];
	for (const group of groups.values()) {
		const winner = group.reduce((best, c) =>
			publisherRank(c.name) < publisherRank(best.name) ? c : best,
		);
		const others = group
			.filter((member) => member !== winner)
			.sort((a, b) => publisherRank(a.name) - publisherRank(b.name));
		const ordered = [winner, ...others];
		const seen = new Set<string>();
		const mergedVariants: ModelVariantInfo[] = [];
		for (const member of ordered) {
			for (const variant of member.variants) {
				const key = `${variant.repoId}:${variant.quant}`;
				if (seen.has(key)) continue;
				seen.add(key);
				mergedVariants.push(variant);
			}
		}
		merged.push({
			...winner,
			variants: mergedVariants,
			siblingRepoIds: others.map((member) => member.name),
		});
	}
	return merged;
}
