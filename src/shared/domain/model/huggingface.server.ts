import { z } from "zod/v4";
import { isMmprojFile, parseQuantFromFilename, parseShardParts } from "./gguf";
import type { ModelVariantInfo } from "./types";

const HF_API = "https://huggingface.co/api";
const REQUEST_TIMEOUT_MS = 15_000;
const HF_INDEX_FIELDS = [
	"author",
	"downloads",
	"likes",
	"tags",
	"lastModified",
	"createdAt",
	"gated",
	"private",
	"pipeline_tag",
];

const hfIndexModelSchema = z.object({
	id: z.string(),
	author: z.string().optional(),
	downloads: z.number().optional(),
	likes: z.number().optional(),
	tags: z.array(z.string()).optional(),
	lastModified: z.string().optional(),
	createdAt: z.string().optional(),
	gated: z.union([z.boolean(), z.string()]).optional(),
	private: z.boolean().optional(),
	pipeline_tag: z.string().optional(),
});
const hfTreeEntrySchema = z.object({
	path: z.string(),
	size: z.number().optional(),
	lfs: z.object({ size: z.number() }).optional(),
});

export type HfIndexModel = z.infer<typeof hfIndexModelSchema>;

function hfHeaders(): Record<string, string> {
	const token = process.env.HF_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function nextPageUrl(link: string | null): string | null {
	if (!link) return null;
	for (const entry of link.split(",")) {
		const [urlPart, relation] = entry.split(";");
		if (!urlPart || !relation?.includes('rel="next"')) continue;
		const match = /<([^>]+)>/.exec(urlPart);
		if (match?.[1]) return match[1];
	}
	return null;
}

/** Fetches one popularity-sorted GGUF index page and its next-page URL. */
export async function getHfGgufIndexPage({
	url,
}: {
	url?: string;
}): Promise<{ models: HfIndexModel[]; nextUrl: string | null }> {
	const pageUrl =
		url ??
		`${HF_API}/models?filter=gguf&sort=downloads&direction=-1&limit=100${HF_INDEX_FIELDS.map(
			(field) => `&expand[]=${field}`,
		).join("")}`;
	const response = await fetch(pageUrl, {
		headers: hfHeaders(),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`${pageUrl} returned HTTP ${response.status}`);
	const models = z.array(hfIndexModelSchema).parse(await response.json());
	return { models, nextUrl: nextPageUrl(response.headers.get("link")) };
}

/** Fetches GGUF variants and their full download sizes from a repository tree. */
export async function getHfGgufVariants({
	repoId,
}: {
	repoId: string;
}): Promise<ModelVariantInfo[]> {
	const url = `${HF_API}/models/${repoId}/tree/main?recursive=true`;
	const response = await fetch(url, {
		headers: hfHeaders(),
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
	const entries = z.array(hfTreeEntrySchema).parse(await response.json());
	const shardTotals = new Map<string, number>();
	for (const entry of entries) {
		if (!entry.path.toLowerCase().endsWith(".gguf") || isMmprojFile(entry.path)) continue;
		const shard = parseShardParts(entry.path);
		if (!shard) continue;
		const bytes = entry.lfs?.size ?? entry.size ?? 0;
		shardTotals.set(shard.prefix, (shardTotals.get(shard.prefix) ?? 0) + bytes);
	}

	const variants: ModelVariantInfo[] = [];
	const seenQuants = new Set<string>();
	for (const entry of entries) {
		if (!entry.path.toLowerCase().endsWith(".gguf") || isMmprojFile(entry.path)) continue;
		const shard = parseShardParts(entry.path);
		if (shard && shard.part !== 1) continue;
		const quant = parseQuantFromFilename(entry.path);
		if (!quant || seenQuants.has(quant)) continue;
		seenQuants.add(quant);
		const bytes = shard ? (shardTotals.get(shard.prefix) ?? 0) : (entry.lfs?.size ?? entry.size);
		variants.push({
			quant,
			sizeGb: bytes ? Math.round((bytes / 1024 ** 3) * 10) / 10 : null,
			fileName: entry.path,
			repoId,
		});
	}
	return variants.sort((a, b) => (a.sizeGb ?? 0) - (b.sizeGb ?? 0));
}
