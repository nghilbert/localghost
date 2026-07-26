import { deriveTags } from "#/routes/_authenticated/library/-lib/catalog";
import {
	type CatalogCandidate,
	dedupeByBaseModel,
	deriveDisplayName,
	isChatModel,
	isMmprojFile,
	parseParamB,
	parseQuantFromFilename,
	parseShardParts,
	pickDefaultVariant,
} from "./catalog-curation";
import type { CatalogModel, ModelVariantInfo } from "./types";

const HF_API = "https://huggingface.co/api";
const INDEX_LIMIT = 400;
const CACHE_TTL_MS = 6 * 60 * 60_000;
const TREE_CONCURRENCY = 8;

function hfHeaders(): Record<string, string> {
	const token = process.env.HF_TOKEN;
	return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url, { headers: hfHeaders(), signal: AbortSignal.timeout(15_000) });
	if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
	return res.json() as Promise<T>;
}

type HfIndexModel = {
	id: string;
	downloads?: number;
	likes?: number;
	tags?: string[];
	lastModified?: string;
	gated?: boolean | string;
	private?: boolean;
	pipeline_tag?: string;
};

type HfTreeEntry = {
	path: string;
	size?: number;
	lfs?: { size: number };
};

async function forEachWithConcurrency<T>({
	items,
	limit,
	fn,
}: {
	items: T[];
	limit: number;
	fn: (item: T) => Promise<void>;
}): Promise<void> {
	const queue = [...items];
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
			await fn(item);
		}
	});
	await Promise.all(workers);
}

/**
 * GGUF variants (one per quant) found in a repo's file tree, ascending by
 * size. A sharded model's first part represents the whole download, with its
 * sibling shards' sizes summed in — llama.cpp's HF downloader fetches every
 * shard for a `repo:QUANT` id, so the reported size should match.
 */
async function fetchVariants(repoId: string): Promise<ModelVariantInfo[]> {
	const entries = await fetchJson<HfTreeEntry[]>(
		`${HF_API}/models/${repoId}/tree/main?recursive=true`,
	);
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
		if (shard && shard.part !== 1) continue; // only the first shard represents the download
		const quant = parseQuantFromFilename(entry.path);
		if (!quant || seenQuants.has(quant)) continue;
		seenQuants.add(quant);
		const bytes = shard ? (shardTotals.get(shard.prefix) ?? 0) : (entry.lfs?.size ?? entry.size);
		variants.push({
			quant,
			sizeGb: bytes ? Math.round((bytes / 1024 ** 3) * 10) / 10 : null,
			fileName: entry.path,
		});
	}
	return variants.sort((a, b) => (a.sizeGb ?? 0) - (b.sizeGb ?? 0));
}

/** Capability hints derived from an HF repo's tags, in place of ollama.com's badges. */
function capabilitiesFromTags(tags: string[]): string[] {
	return tags.includes("image-text-to-text") || tags.includes("vision") ? ["vision"] : [];
}

/** Fetches the GGUF model index plus per-repo file trees, filtered and deduped to chat models. */
async function fetchHfCatalog(): Promise<CatalogModel[]> {
	const index = await fetchJson<HfIndexModel[]>(
		`${HF_API}/models?filter=gguf&sort=downloads&direction=-1&limit=${INDEX_LIMIT}&full=true`,
	);
	const eligible = index.filter(
		(m) =>
			!m.gated && !m.private && isChatModel({ pipelineTag: m.pipeline_tag, tags: m.tags ?? [] }),
	);
	if (eligible.length === 0) {
		throw new Error("Hugging Face GGUF index returned 0 eligible models");
	}

	const candidates: CatalogCandidate[] = [];
	await forEachWithConcurrency({
		items: eligible,
		limit: TREE_CONCURRENCY,
		fn: async (repo) => {
			let variants: ModelVariantInfo[];
			try {
				variants = await fetchVariants(repo.id);
			} catch (error) {
				console.warn("Failed to fetch a repo's GGUF file tree", { repo: repo.id, error });
				return;
			}
			const paramB = parseParamB(repo.id);
			if (variants.length === 0 || paramB === null) return; // drop tombstones/non-model repos

			candidates.push({
				name: repo.id,
				paramB,
				capabilities: capabilitiesFromTags(repo.tags ?? []),
				pullCount: repo.downloads ?? 0,
				updatedAt: repo.lastModified,
				variants,
			});
		},
	});

	return dedupeByBaseModel(candidates).map((candidate) => {
		const defaultVariant = pickDefaultVariant(candidate.variants);
		return {
			id: `${candidate.name}:${defaultVariant?.quant ?? "latest"}`,
			name: candidate.name,
			displayName: deriveDisplayName(candidate.name),
			paramB: candidate.paramB,
			sizeGb: defaultVariant?.sizeGb ?? null,
			contextK: null,
			tags: deriveTags({
				name: candidate.name,
				paramB: candidate.paramB,
				capabilities: candidate.capabilities,
			}),
			capabilities: candidate.capabilities,
			description: "",
			pullCount: candidate.pullCount,
			updatedAt: candidate.updatedAt,
			variants: candidate.variants,
		};
	});
}

let cache: { data: CatalogModel[]; fetchedAt: number } | null = null;
let refreshInFlight: Promise<CatalogModel[]> | null = null;

/**
 * Returns the catalog, re-fetching at most once per TTL. A stale cache is
 * served immediately while the refresh runs in the background; with no cache
 * at all the caller waits, and a failed fetch propagates so the client can
 * show its retry affordance instead of an empty library.
 * @throws when no cached catalog exists and the fetch fails or returns zero models
 */
export async function getCatalog(): Promise<CatalogModel[]> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

	refreshInFlight ??= fetchHfCatalog()
		.then((data) => {
			cache = { data, fetchedAt: Date.now() };
			return data;
		})
		.catch((error) => {
			console.error("Hugging Face catalog fetch failed", { error });
			throw error;
		})
		.finally(() => {
			refreshInFlight = null;
		});

	if (cache) {
		refreshInFlight.catch(() => {}); // keep serving stale data if the refresh fails
		return cache.data;
	}
	return refreshInFlight;
}
