import { rankItem } from "@tanstack/match-sorter-utils";
import { requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import {
	type CatalogCandidate,
	contextKFromLength,
	dedupeByBaseModel,
	deriveDisplayName,
	deriveTags,
	paramBFromTotal,
	pickDefaultVariant,
} from "./catalog-curation";
import {
	CHAT_PIPELINE_TAGS,
	getGgufChatModel,
	type HfChatModel,
	listGgufChatModels,
	listGgufVariants,
} from "./huggingface.server";
import { parseParamB } from "./model-id";
import type { CatalogQuery } from "./schemas";
import type { CatalogModel, ModelVariantInfo } from "./types";

const CATALOG_TARGET = 300;
/** Index entries pulled per pipeline tag. One request per 100, so this stays cheap. */
const SCAN_LIMIT_PER_TAG = 600;
const TREE_CONCURRENCY = 8;
const CACHE_TTL_MS = 6 * 60 * 60_000;
/** Sibling repos `listGroupVariants` will query; a dedupe group can have far more members. */
const MAX_SIBLING_REPOS = 24;

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
		for (let item = queue.shift(); item !== undefined; item = queue.shift()) await fn(item);
	});
	await Promise.all(workers);
}

/**
 * A grouping candidate built from index metadata alone.
 *
 * Parameter count prefers the Hub's parsed GGUF header and falls back to the id;
 * the fallback reads the *base model* id where one exists, which is far more
 * parseable than a repacker's (`Qwen/Qwen3-8B`, not `bartowski/Qwen_Qwen3-8B-GGUF`).
 */
function toCandidate(model: HfChatModel): CatalogCandidate {
	const canonicalId = model.baseModelIds[0] ?? model.repoId;
	return {
		name: model.repoId,
		paramB: paramBFromTotal(model.paramTotal ?? undefined) ?? parseParamB(canonicalId),
		contextK: contextKFromLength(model.contextLength ?? undefined),
		capabilities: model.isVision ? ["vision"] : [],
		pullCount: model.downloads,
		updatedAt: model.updatedAt ?? undefined,
		variants: [],
		author: model.author,
		license: model.license,
		likes: model.likes,
		createdAt: model.createdAt,
		baseModelIds: model.baseModelIds,
		siblingRepoIds: [],
	};
}

function toCatalogModel(candidate: CatalogCandidate): CatalogModel {
	const defaultVariant = pickDefaultVariant(candidate.variants);
	/** The base-model link names the model itself; a repacker's id names their build of it. */
	const canonicalId = candidate.baseModelIds[0] ?? candidate.name;
	return {
		id: `${defaultVariant?.repoId ?? candidate.name}:${defaultVariant?.quant ?? "latest"}`,
		name: candidate.name,
		displayName: deriveDisplayName(canonicalId),
		paramB: candidate.paramB,
		sizeGb: defaultVariant?.sizeGb ?? null,
		contextK: candidate.contextK,
		tags: deriveTags({
			name: candidate.name,
			paramB: candidate.paramB,
			capabilities: candidate.capabilities,
		}),
		capabilities: candidate.capabilities,
		description: "",
		author: candidate.author,
		license: candidate.license,
		likes: candidate.likes,
		pullCount: candidate.pullCount,
		updatedAt: candidate.updatedAt,
		createdAt: candidate.createdAt,
		variants: candidate.variants,
		siblingRepoIds: candidate.siblingRepoIds,
	};
}

/**
 * Fetches, groups, and enriches the popular public GGUF catalog.
 *
 * Grouping runs on index metadata alone so only surviving entries cost a file-tree
 * request — one per group rather than one per repo, which keeps a refresh inside the
 * Hub's 500-requests-per-5-minutes anonymous budget. A group's other publishers are
 * still listed; their quants load when the user opens the model.
 */
async function fetchHfCatalog(): Promise<CatalogModel[]> {
	const accessToken = process.env.HF_TOKEN;
	const listed: HfChatModel[] = [];
	for (const task of CHAT_PIPELINE_TAGS) {
		listed.push(...(await listGgufChatModels({ task, limit: SCAN_LIMIT_PER_TAG, accessToken })));
	}
	if (listed.length === 0) throw new Error("Hugging Face GGUF index returned 0 eligible models");

	const grouped = dedupeByBaseModel(listed.map(toCandidate))
		.sort((a, b) => b.pullCount - a.pullCount)
		.slice(0, CATALOG_TARGET);

	const enriched: CatalogCandidate[] = [];
	await forEachWithConcurrency({
		items: grouped,
		limit: TREE_CONCURRENCY,
		fn: async (candidate) => {
			try {
				const variants = await listGgufVariants({ repoId: candidate.name, accessToken });
				if (variants.length > 0) enriched.push({ ...candidate, variants });
			} catch (error) {
				console.warn("Failed to list a repo's GGUF files", { repo: candidate.name, error });
			}
		},
	});

	return enriched.map(toCatalogModel).sort((a, b) => b.pullCount - a.pullCount);
}

let cache: { data: CatalogModel[]; fetchedAt: number } | null = null;
let refreshInFlight: Promise<CatalogModel[]> | null = null;

/** Returns the cached catalog while refreshing stale results in the background. */
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
		refreshInFlight.catch(() => {});
		return cache.data;
	}
	return refreshInFlight;
}

function sortValue(model: CatalogModel, sortBy: CatalogQuery["sortBy"]): number | string {
	switch (sortBy) {
		case "name":
			return model.displayName.toLowerCase();
		case "paramB":
			return model.paramB ?? -Infinity;
		case "sizeGb":
			return model.sizeGb ?? -Infinity;
		case "pullCount":
			return model.pullCount;
		case "likes":
			return model.likes;
		case "updatedAt":
			return model.updatedAt ?? "";
		case "createdAt":
			return model.createdAt ?? "";
		case "memory":
			return requiredMemoryGb(model) ?? -Infinity;
		default:
			return 0;
	}
}

/**
 * A page of the cached catalog: search/license/capability-filtered, sorted, and sliced
 * in memory, never a new Hugging Face round-trip per page.
 */
export async function getCatalogPage(
	query: CatalogQuery,
): Promise<{ rows: CatalogModel[]; total: number; availableLicenses: string[] }> {
	const all = await getCatalog();

	const availableLicenses = [
		...new Set(all.map((m) => m.license).filter((license): license is string => license !== null)),
	].sort();

	let filtered = all;
	if (query.licenses && query.licenses.length > 0) {
		const licenses = new Set(query.licenses);
		filtered = filtered.filter((model) => model.license !== null && licenses.has(model.license));
	}
	if (query.capabilities && query.capabilities.length > 0) {
		const capabilities = new Set<string>(query.capabilities);
		filtered = filtered.filter((model) => model.tags.some((tag) => capabilities.has(tag)));
	}
	if (query.search) {
		const search = query.search;
		filtered = filtered.filter(
			(model) =>
				rankItem(`${model.displayName} ${model.name} ${model.tags.join(" ")}`, search).passed,
		);
	}

	const dir = query.sortDir === "asc" ? 1 : -1;
	const sorted = [...filtered].sort((a, b) => {
		const left = sortValue(a, query.sortBy);
		const right = sortValue(b, query.sortBy);
		if (left < right) return -1 * dir;
		if (left > right) return 1 * dir;
		return 0;
	});

	const start = query.page * query.pageSize;
	return {
		rows: sorted.slice(start, start + query.pageSize),
		total: sorted.length,
		availableLicenses,
	};
}

/**
 * The warm-cache entry whose dedupe group already contains `repoId`, if any.
 *
 * Best-effort only: it never triggers a fetch, so a cold cache simply finds nothing.
 * Used to carry a group's `siblingRepoIds` over to a model resolved outside the
 * catalog scan (an installed model whose exact quant isn't the group's default).
 */
function findCachedGroupByRepo(repoId: string): CatalogModel | null {
	if (!cache) return null;
	return (
		cache.data.find((model) => model.name === repoId || model.siblingRepoIds.includes(repoId)) ??
		null
	);
}

/**
 * Resolves one `"{repoId}:{quant}"` id directly, without a catalog scan.
 *
 * Overrides {@link toCatalogModel}'s derived `id` with the exact one requested, since
 * `pickDefaultVariant` may otherwise pick a different quant as the row's "default".
 * `siblingRepoIds` is borrowed from the warm cache's dedupe group when this repo is a
 * member of one, so a picker built from this row can still offer cross-publisher
 * quants; on a cold cache it degrades to this repo's own quants.
 */
async function resolveCatalogModelById({
	id,
	accessToken,
}: {
	id: string;
	accessToken: string | undefined;
}): Promise<CatalogModel | null> {
	const separatorIndex = id.lastIndexOf(":");
	if (separatorIndex === -1) return null;
	const repoId = id.slice(0, separatorIndex);
	const quant = id.slice(separatorIndex + 1);

	const model = await getGgufChatModel({ repoId, accessToken });
	if (!model) return null;

	const variants = await listGgufVariants({ repoId, accessToken });
	const variant = variants.find((v) => v.quant === quant);
	if (!variant) return null;

	const cachedGroup = findCachedGroupByRepo(repoId);
	const candidate = toCandidate(model);
	const resolved = toCatalogModel({
		...candidate,
		variants,
		siblingRepoIds: cachedGroup?.siblingRepoIds ?? candidate.siblingRepoIds,
	});
	return { ...resolved, id, sizeGb: variant.sizeGb ?? resolved.sizeGb };
}

/**
 * Fetches every quant across one dedupe group's repos: the primary plus its known
 * siblings, for the variant picker's cross-publisher option list.
 *
 * Called lazily when a detail panel opens — never during the catalog scan, which is
 * what previously multiplied file-tree requests by group size and exceeded the Hub's
 * anonymous rate limit. Per-repo failures are skipped, not fatal. Siblings past
 * {@link MAX_SIBLING_REPOS} are dropped: the primary repo's quants always load,
 * and each extra publisher costs one more HF request.
 */
export async function listGroupVariants({
	repoId,
	siblingRepoIds,
}: {
	repoId: string;
	siblingRepoIds: string[];
}): Promise<ModelVariantInfo[]> {
	const accessToken = process.env.HF_TOKEN;
	const repos = [repoId, ...siblingRepoIds.slice(0, MAX_SIBLING_REPOS)];
	const byRepo = new Map<string, ModelVariantInfo[]>();

	await forEachWithConcurrency({
		items: repos,
		limit: TREE_CONCURRENCY,
		fn: async (repo) => {
			try {
				byRepo.set(repo, await listGgufVariants({ repoId: repo, accessToken }));
			} catch (error) {
				console.warn("Failed to list a sibling repo's GGUF files", { repo, error });
			}
		},
	});

	const seen = new Set<string>();
	const merged: ModelVariantInfo[] = [];
	for (const repo of repos) {
		for (const variant of byRepo.get(repo) ?? []) {
			const key = `${variant.repoId}:${variant.quant}`;
			if (seen.has(key)) continue;
			seen.add(key);
			merged.push(variant);
		}
	}
	return merged;
}

/**
 * Looks up specific catalog entries by id, for enriching installed/pulling rows.
 *
 * Serves cache hits from the in-memory catalog when warm; resolves misses with a
 * direct per-repo fetch rather than triggering a full catalog scan.
 */
export async function getCatalogModelsByIds(ids: string[]): Promise<CatalogModel[]> {
	const idSet = new Set(ids);
	const cached = cache ? cache.data.filter((model) => idSet.has(model.id)) : [];
	const cachedIds = new Set(cached.map((model) => model.id));
	const missingIds = ids.filter((id) => !cachedIds.has(id));
	if (missingIds.length === 0) return cached;

	const accessToken = process.env.HF_TOKEN;
	const resolved = await Promise.all(
		missingIds.map((id) => resolveCatalogModelById({ id, accessToken })),
	);
	return [...cached, ...resolved.filter((model): model is CatalogModel => model !== null)];
}
