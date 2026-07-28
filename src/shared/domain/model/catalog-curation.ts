import type { GgufQuant } from "./gguf";
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

/** Preferred default quant order: a solid quality/size tradeoff first, then progressively looser. */
const PREFERRED_QUANT_ORDER: GgufQuant[] = [
	"Q4_K_M",
	"Q4_K_S",
	"Q5_K_M",
	"Q4_0",
	"Q8_0",
	"MXFP4",
	"Q6_K",
	"Q3_K_M",
];

/** Picks the variant to install by default: the best-tradeoff quant available, not the largest file. */
export function pickDefaultVariant(variants: ModelVariantInfo[]): ModelVariantInfo | null {
	if (variants.length === 0) return null;
	for (const preferred of PREFERRED_QUANT_ORDER) {
		const match = variants.find((v) => v.quant === preferred);
		if (match) return match;
	}
	const underEightGb = variants.filter((v) => (v.sizeGb ?? Number.POSITIVE_INFINITY) <= 8);
	if (underEightGb.length > 0) {
		return underEightGb.reduce((best, v) => ((v.sizeGb ?? 0) > (best.sizeGb ?? 0) ? v : best));
	}
	return variants.reduce((smallest, v) =>
		(v.sizeGb ?? Number.POSITIVE_INFINITY) < (smallest.sizeGb ?? Number.POSITIVE_INFINITY)
			? v
			: smallest,
	);
}

const CHAT_PIPELINE_TAGS = new Set(["text-generation", "image-text-to-text"]);
const NON_CHAT_TAGS = new Set([
	"automatic-speech-recognition",
	"text-to-image",
	"text-to-video",
	"image-to-video",
	"video-to-video",
	"feature-extraction",
	"sentence-similarity",
	"text-to-speech",
	"translation",
	"image-to-image",
	"any-to-any",
]);

/** Whether a repo (by its pipeline tag / tags) is something you'd chat with, not ASR/image-gen/embeddings. */
export function isChatModel({
	pipelineTag,
	tags,
}: {
	pipelineTag: string | undefined;
	tags: string[];
}): boolean {
	if (pipelineTag) return CHAT_PIPELINE_TAGS.has(pipelineTag);
	if (tags.some((tag) => NON_CHAT_TAGS.has(tag))) return false;
	return tags.includes("conversational");
}

/** Tiered publisher trust, used only to break dedupe ties — an unlisted publisher still appears. */
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

// Repack/training-stage markers stripped off the tail when computing a dedupe key.
const REPACK_SUFFIXES = [
	"-gguf",
	"-it",
	"-instruct",
	"-qat",
	"-mtp",
	"-abliterated",
	"-uncensored",
	"-chat",
];

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
	"name" | "paramB" | "capabilities" | "updatedAt"
> & {
	pullCount: number;
	variants: ModelVariantInfo[];
};

/**
 * Collapses repacks of the same base model to the best-ranked publisher's
 * entry, merging every duplicate's variants in so the quant picker stays rich.
 */
export function dedupeByBaseModel(candidates: CatalogCandidate[]): CatalogCandidate[] {
	const groups = new Map<string, CatalogCandidate[]>();
	for (const candidate of candidates) {
		const key = baseModelKey(candidate.name);
		const group = groups.get(key);
		if (group) group.push(candidate);
		else groups.set(key, [candidate]);
	}

	const merged: CatalogCandidate[] = [];
	for (const group of groups.values()) {
		const winner = group.reduce((best, c) =>
			publisherRank(c.name) < publisherRank(best.name) ? c : best,
		);
		const seenQuants = new Set(winner.variants.map((v) => v.quant));
		const mergedVariants = [...winner.variants];
		for (const other of group) {
			if (other === winner) continue;
			for (const variant of other.variants) {
				if (!seenQuants.has(variant.quant)) {
					seenQuants.add(variant.quant);
					mergedVariants.push(variant);
				}
			}
		}
		merged.push({ ...winner, variants: mergedVariants });
	}
	return merged;
}
