import { findNearestQuantType, GGMLFileQuantizationType } from "@huggingface/gguf";
import type { CatalogModel, ModelVariantInfo } from "./types";

function splitOnDelimiters(text: string, delimiters: string): string[] {
	let parts = [text];
	for (const delimiter of delimiters) parts = parts.flatMap((part) => part.split(delimiter));
	return parts.filter((part) => part.length > 0);
}

/** Builds capability and search tags for one catalog model. */
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

/** Reverse lookup built once from the enum's own forward (name → value) entries. */
const QUANT_LABEL_TO_TYPE = new Map<string, GGMLFileQuantizationType>(
	Object.entries(GGMLFileQuantizationType).filter(
		(entry): entry is [string, GGMLFileQuantizationType] => typeof entry[1] === "number",
	),
);

/** Maps a parsed quant label (e.g. `"Q4_K_M"`, unsloth's `"UD-Q4_K_XL"`) to its enum member. */
function quantTypeFromLabel(quant: string): GGMLFileQuantizationType | undefined {
	const key = quant.startsWith("UD-") ? quant.slice("UD-".length) : quant;
	return QUANT_LABEL_TO_TYPE.get(key);
}

/** Target quant for the default install: a solid quality/size tradeoff. */
const DEFAULT_QUANT_TARGET = GGMLFileQuantizationType.Q4_K_M;

/**
 * Picks the variant to install by default: the quant nearest {@link DEFAULT_QUANT_TARGET}
 * at or below it, not the largest file.
 *
 * Falls back to the smallest file only for labels outside the GGUF quant enum, which
 * `parseGGUFQuantLabel` does not produce in practice.
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

/** Tiered publisher trust used only to break dedupe ties; unlisted publishers still appear. */
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

/** Packaging markers removed when computing a dedupe key.
 * Training and safety-tuning markers stay because they identify distinct fine-tunes.
 */
const REPACK_SUFFIXES = ["-gguf", "-it", "-instruct"];

/**
 * The key that collapses every repack of one model into a single catalog entry.
 *
 * Prefers the Hub's own `baseModels` link, which quantizers are told to set on GGUF
 * repacks, making it authoritative where the name heuristic is only a guess. Plenty
 * of repos still omit it, so {@link baseModelKey} remains the fallback.
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

/** Billions of parameters from the Hub's parsed `gguf.total`, rounded for display. */
export function paramBFromTotal(total: number | undefined): number | null {
	if (total === undefined || total <= 0) return null;
	const billions = total / 1e9;
	return billions >= 10 ? Math.round(billions) : Math.round(billions * 10) / 10;
}

/** Context window in K tokens from the Hub's parsed `gguf.context_length`. */
export function contextKFromLength(contextLength: number | undefined): number | null {
	if (contextLength === undefined || contextLength <= 0) return null;
	return Math.round(contextLength / 1024);
}

/** Normalizes a repo id to a base key so repacks of the same model by different publishers collide. */
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

/** A human display name from a repo id's model segment, e.g. "unsloth/Qwen3.5-4B-GGUF" → "Qwen3.5 4B". */
function isDigit(char: string): boolean {
	return char >= "0" && char <= "9";
}

export function deriveDisplayName(repoId: string): string {
	const name = repoId.split("/")[1] ?? repoId;
	const words = splitOnDelimiters(name, "-_")
		.filter((word) => !REPACK_SUFFIXES.includes(`-${word.toLowerCase()}`))
		.filter((word) => word.toLowerCase() !== "gguf");
	return words
		.map((word) => {
			const first = word.charAt(0);
			if (isDigit(first)) return word.toUpperCase();
			return first.toUpperCase() + word.slice(1);
		})
		.join(" ");
}

/** One catalog candidate before dedupe: enough to rank and merge. */
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
	/** Repos this one derives from, per the Hub's `baseModels` link; empty when the repo omits it. */
	baseModelIds: string[];
	/** Other repos this one's dedupe group collapsed, once merged; empty before merging. */
	siblingRepoIds: string[];
};

/**
 * Collapses repacks of the same base model into one entry.
 *
 * The best-ranked publisher supplies the entry's metadata, but every member's files
 * are kept — keyed by repo *and* quant rather than quant alone — so the same quant
 * from two publishers stays selectable and the picker can offer both axes.
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
