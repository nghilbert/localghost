import { z } from "zod/v4";
import type { CatalogModel, ModelVariantInfo } from "./types";

/** Splits `text` on any of the literal single-character `delimiters`, dropping empty tokens. */
function splitOnDelimiters(text: string, delimiters: string): string[] {
	let parts = [text];
	for (const delimiter of delimiters) {
		parts = parts.flatMap((part) => part.split(delimiter));
	}
	return parts.filter((part) => part.length > 0);
}

/** Every GGUF quant name llama.cpp produces; a closed set, so parsing is a lookup, not a pattern. */
export const GGUF_QUANTS = [
	"Q2_K",
	"Q3_K_S",
	"Q3_K_M",
	"Q3_K_L",
	"Q4_0",
	"Q4_K_S",
	"Q4_K_M",
	"Q5_K_S",
	"Q5_K_M",
	"Q6_K",
	"Q8_0",
	"IQ2_M",
	"IQ3_M",
	"IQ4_XS",
	"IQ4_NL",
	"MXFP4",
	"MXFP4_MOE",
	"TQ1_0",
	"TQ2_0",
	"F16",
	"F32",
	"BF16",
] as const;
export const ggufQuantSchema = z.enum(GGUF_QUANTS);
export type GgufQuant = z.infer<typeof ggufQuantSchema>;

// Longest-first so "Q4_K_M" matches before the shorter "Q4" would.
const QUANTS_LONGEST_FIRST = [...GGUF_QUANTS].sort((a, b) => b.length - a.length);

/** Parses the quant out of a GGUF filename by matching a `-`/`.`-delimited token against the known set. */
export function parseQuantFromFilename(fileName: string): GgufQuant | null {
	const upper = fileName.toUpperCase();
	const tokens = splitOnDelimiters(upper, "-.");
	for (const quant of QUANTS_LONGEST_FIRST) {
		if (tokens.includes(quant)) return quant;
	}
	return null;
}

/** True for a multimodal projector file, never a chat model's own weights. */
export function isMmprojFile(fileName: string): boolean {
	return fileName.toLowerCase().startsWith("mmproj-");
}

/** The `{prefix}-{part}-of-{total}.gguf` pieces of a sharded GGUF filename, or null if not sharded. */
export function parseShardParts(
	fileName: string,
): { prefix: string; part: number; total: number } | null {
	const lower = fileName.toLowerCase();
	if (!lower.endsWith(".gguf")) return null;
	const stem = fileName.slice(0, -".gguf".length);
	const tokens = stem.split("-");
	const ofIndex = tokens.indexOf("of");
	if (ofIndex < 2) return null;
	const part = Number(tokens[ofIndex - 1]);
	const total = Number(tokens[ofIndex + 1]);
	if (!Number.isInteger(part) || !Number.isInteger(total)) return null;
	return { prefix: tokens.slice(0, ofIndex - 1).join("-"), part, total };
}

/** Parses a mixture-of-experts token like "8x7b" into total params (8 * 7 = 56), or null. */
function parseMoeToken(token: string): number | null {
	const lower = token.toLowerCase();
	if (!lower.endsWith("b") || lower.length < 2) return null;
	const withoutSuffix = lower.slice(0, -1);
	const xIndex = withoutSuffix.indexOf("x");
	if (xIndex <= 0 || xIndex >= withoutSuffix.length - 1) return null;
	const experts = Number(withoutSuffix.slice(0, xIndex));
	const sizeB = Number(withoutSuffix.slice(xIndex + 1));
	if (Number.isNaN(experts) || Number.isNaN(sizeB)) return null;
	return experts * sizeB;
}

/** Billions of parameters parsed from an HF repo id or GGUF filename, e.g. "Qwen3-8B" → 8. */
export function parseParamB(id: string): number | null {
	const tokens = splitOnDelimiters(id, "-._/");
	for (const token of tokens) {
		const moe = parseMoeToken(token);
		if (moe !== null) return moe;

		const lower = token.toLowerCase();
		if (lower.endsWith("b") && lower.length > 1) {
			const value = Number(lower.slice(0, -1));
			if (!Number.isNaN(value)) return value;
		}
		if (lower.endsWith("m") && lower.length > 1) {
			const value = Number(lower.slice(0, -1));
			if (!Number.isNaN(value)) return value / 1000;
		}
	}
	return null;
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
