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
	type HfChatModel,
	listGgufChatModels,
	listGgufVariants,
} from "./huggingface.server";
import { parseParamB } from "./model-id";
import type { CatalogQuery } from "./schemas";
import type { CatalogModel } from "./types";

const CATALOG_TARGET = 300;
/** Index entries pulled per pipeline tag. One request per 100, so this stays cheap. */
const SCAN_LIMIT_PER_TAG = 600;
const TREE_CONCURRENCY = 8;
const CACHE_TTL_MS = 6 * 60 * 60_000;

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
 * A page of the cached catalog: search/license-filtered, sorted, and sliced
 * in memory, never a new Hugging Face round-trip per page.
 */
export async function getCatalogPage(
	query: CatalogQuery,
): Promise<{ rows: CatalogModel[]; total: number; availableLicenses: string[] }> {
	const all = await getCatalog();

	const availableLicenses = [
		...new Set(all.map((m) => m.license).filter((license): license is string => license !== null)),
	].sort();

	let filtered = query.license ? all.filter((model) => model.license === query.license) : all;
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

/** Looks up specific catalog entries by id out of the full cached array, for enriching installed/pulling rows. */
export async function getCatalogModelsByIds(ids: string[]): Promise<CatalogModel[]> {
	const idSet = new Set(ids);
	const all = await getCatalog();
	return all.filter((model) => idSet.has(model.id));
}
