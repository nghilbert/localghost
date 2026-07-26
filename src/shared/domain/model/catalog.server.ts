import { rankItem } from "@tanstack/match-sorter-utils";
import { requiredMemoryGb } from "#/shared/domain/model/hardware-fit";
import {
	type CatalogCandidate,
	dedupeByBaseModel,
	deriveDisplayName,
	deriveLicense,
	deriveTags,
	isChatModel,
	pickDefaultVariant,
} from "./catalog-curation";
import { getHfGgufIndexPage, getHfGgufVariants, type HfIndexModel } from "./huggingface.server";
import { parseParamB } from "./model-id";
import type { CatalogQuery } from "./schemas";
import type { CatalogModel, ModelVariantInfo } from "./types";

const CATALOG_TARGET = 200;
const RAW_SCAN_LIMIT = 400;
const TREE_CONCURRENCY = 8;
const CACHE_TTL_MS = 6 * 60 * 60_000;

function isEligibleModel(model: HfIndexModel): boolean {
	return (
		!model.gated &&
		!model.private &&
		isChatModel({ pipelineTag: model.pipeline_tag, tags: model.tags ?? [] })
	);
}

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

/** Collects up to 200 eligible models from at most 400 raw index entries. */
async function collectEligibleModels(): Promise<HfIndexModel[]> {
	const eligible: HfIndexModel[] = [];
	let rawScanned = 0;
	let nextUrl: string | null = null;

	while (rawScanned < RAW_SCAN_LIMIT && eligible.length < CATALOG_TARGET) {
		const page = await getHfGgufIndexPage({ url: nextUrl ?? undefined });
		const remainingRaw = RAW_SCAN_LIMIT - rawScanned;
		const models = page.models.slice(0, remainingRaw);
		rawScanned += models.length;
		for (const model of models) {
			if (isEligibleModel(model)) eligible.push(model);
			if (eligible.length === CATALOG_TARGET) return eligible;
		}
		if (!page.nextUrl || models.length === 0) break;
		nextUrl = page.nextUrl;
	}
	return eligible;
}

function capabilitiesFromTags(tags: string[]): string[] {
	return tags.includes("image-text-to-text") || tags.includes("vision") ? ["vision"] : [];
}

function toCatalogModel(candidate: CatalogCandidate): CatalogModel {
	const defaultVariant = pickDefaultVariant(candidate.variants);
	return {
		id: `${defaultVariant?.repoId ?? candidate.name}:${defaultVariant?.quant ?? "latest"}`,
		name: candidate.name,
		displayName: deriveDisplayName(candidate.name),
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

/** Fetches, enriches, and deduplicates the popular public GGUF catalog. */
async function fetchHfCatalog(): Promise<CatalogModel[]> {
	const eligible = await collectEligibleModels();
	if (eligible.length === 0) throw new Error("Hugging Face GGUF index returned 0 eligible models");

	const candidates: CatalogCandidate[] = [];
	await forEachWithConcurrency({
		items: eligible,
		limit: TREE_CONCURRENCY,
		fn: async (repo) => {
			let variants: ModelVariantInfo[];
			try {
				variants = await getHfGgufVariants({ repoId: repo.id });
			} catch (error) {
				console.warn("Failed to fetch a repo's GGUF file tree", { repo: repo.id, error });
				return;
			}
			const paramB = parseParamB(repo.id);
			if (variants.length === 0 || paramB === null) return;
			candidates.push({
				name: repo.id,
				paramB,
				capabilities: capabilitiesFromTags(repo.tags ?? []),
				pullCount: repo.downloads ?? 0,
				updatedAt: repo.lastModified,
				variants,
				author: repo.author ?? null,
				license: deriveLicense({
					cardDataLicense: undefined,
					tags: repo.tags ?? [],
				}),
				likes: repo.likes ?? 0,
				createdAt: repo.createdAt ?? null,
				contextK: null,
			});
		},
	});
	return dedupeByBaseModel(candidates).map(toCatalogModel);
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
