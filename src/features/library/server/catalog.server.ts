import { rankItem } from "@tanstack/match-sorter-utils";
import {
	catalogSearchText,
	compareModels,
	isFitHidden,
} from "#/features/library/lib/catalog-query";
import {
	type CatalogCandidate,
	contextKFromLength,
	dedupeByBaseModel,
	deriveDisplayName,
	deriveTags,
	paramBFromTotal,
	pickDefaultVariant,
} from "#/features/library/lib/curation";
import { parseParamB } from "#/features/library/lib/model-id";
import type { CatalogQuery } from "#/features/library/library.schemas";
import type { CatalogModel, ModelVariantInfo } from "#/features/library/library.types";
import { MS_PER_HOUR } from "#/lib/format";
import { getHardwareInfo } from "./hardware.server";
import {
	getGgufChatModel,
	type HfChatModel,
	listGgufChatModels,
	listGgufVariants,
} from "./huggingface.server";

const CATALOG_TARGET = 300;
/** Repos read from the Hub's GGUF index, 100 per request. */
const SCAN_LIMIT = 600;
const TREE_CONCURRENCY = 8;
const CACHE_TTL_MS = 6 * MS_PER_HOUR;
/** The most related repos `listGroupVariants` queries. */
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
 * A candidate built from index metadata alone. Without a GGUF header, the parameter count
 * comes from the base model's id (`Qwen/Qwen3-8B`), which parses better than a repack's.
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
 * Fetches and groups the popular public GGUF models. Files are listed once per group, not
 * per repo, to stay inside the Hub's anonymous rate limit; other repos' quants load when a
 * model is opened.
 */
async function fetchHfCatalog(): Promise<CatalogModel[]> {
	const accessToken = process.env.HF_TOKEN;
	const listed = await listGgufChatModels({ limit: SCAN_LIMIT, accessToken });
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

/** A filtered, sorted page of the cached catalog, with the licenses available to filter by. */
export async function getCatalogPage(
	query: CatalogQuery,
): Promise<{ rows: CatalogModel[]; total: number; availableLicenses: string[] }> {
	const all = await getCatalog();

	const availableLicenses = [
		...new Set(all.map((m) => m.license).filter((license): license is string => license !== null)),
	].sort();

	let filtered = all;
	if (query.hiddenFits.length > 0) {
		const hardware = await getHardwareInfo();
		filtered = filtered.filter(
			(model) => !isFitHidden({ model, hardware, hiddenFits: query.hiddenFits }),
		);
	}
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
		filtered = filtered.filter((model) => rankItem(catalogSearchText(model), search).passed);
	}

	const sorted = [...filtered].sort((left, right) =>
		compareModels({ left, right, sortBy: query.sortBy, sortDir: query.sortDir }),
	);

	const start = query.page * query.pageSize;
	return {
		rows: sorted.slice(start, start + query.pageSize),
		total: sorted.length,
		availableLicenses,
	};
}

/** The cached catalog entry whose group contains `repoId`. Never fetches, so an empty cache finds nothing. */
function findCachedGroupByRepo(repoId: string): CatalogModel | null {
	if (!cache) return null;
	return (
		cache.data.find((model) => model.name === repoId || model.siblingRepoIds.includes(repoId)) ??
		null
	);
}

/**
 * Fetches one `"{repoId}:{quant}"` model from the Hub, keeping the requested quant as its id.
 * Related repos come from the cache when available.
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
 * Every quant across a model's main repo and up to {@link MAX_SIBLING_REPOS} related repos.
 * A repo that fails to list is skipped.
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

/** Catalog entries for the given ids, from the cache or else fetched one repo at a time. */
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
