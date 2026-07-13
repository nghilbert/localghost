import { parseHTML } from "linkedom";
import { deriveTags, enrichCatalogModel, parseParamB } from "#/features/pull-model/lib/catalog";
import type { CatalogModel, ModelTagInfo } from "#/features/pull-model/lib/types";

const LIBRARY_URL = "https://ollama.com/library?sort=popular";
const CACHE_TTL_MS = 6 * 60 * 60_000;
const TAGS_CONCURRENCY = 8;
const FETCH_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)" };

/**
 * Parses the ollama.com/library index HTML into one CatalogModel per size
 * variant, keying off the page's stable `x-test-*` hooks. A model with no size
 * tags (e.g. embeddings) yields a single variant with the bare model name.
 */
export function parseCatalogHtml(html: string): CatalogModel[] {
	const { document } = parseHTML(html);
	const models: CatalogModel[] = [];

	for (const node of document.querySelectorAll("[x-test-model]")) {
		const name =
			node.querySelector("[x-test-model-title]")?.getAttribute("title")?.trim() ??
			node.querySelector("[x-test-model-title] span")?.textContent?.trim();
		if (!name) continue;

		const description = node.querySelector("[x-test-model-title] p")?.textContent?.trim() ?? "";
		const capabilities = [...node.querySelectorAll("[x-test-capability]")].map((el) =>
			(el.textContent ?? "").trim(),
		);
		const sizes = [...node.querySelectorAll("[x-test-size]")].map((el) =>
			(el.textContent ?? "").trim(),
		);
		const pullCount = node.querySelector("[x-test-pull-count]")?.textContent?.trim() ?? "";
		const updatedEl = node.querySelector("[x-test-updated]");
		const updated = updatedEl?.textContent?.trim() ?? "";
		const updatedAt = parseUpdatedAt(updatedEl?.closest("span[title]")?.getAttribute("title"));

		const variants = sizes.length > 0 ? sizes : [null];
		for (const size of variants) {
			const paramB = size ? parseParamB(size) : null;
			models.push({
				id: size ? `${name}:${size}` : name,
				name,
				paramB,
				sizeGb: null,
				contextK: null,
				tags: deriveTags({ name, description, paramB, capabilities }),
				capabilities,
				description,
				pullCount,
				updated,
				updatedAt,
			});
		}
	}

	return models;
}

/**
 * Parses a model's ollama.com tags page into one entry per tag. Each `div.group`
 * row holds the tag link plus text like "dbd6b9ea93de • 4.9GB • 128K context
 * window"; the tag-keyed map collapses the mobile/desktop duplicate links.
 */
export function parseTagsHtml(html: string): ModelTagInfo[] {
	const { document } = parseHTML(html);
	const byTag = new Map<string, ModelTagInfo>();

	for (const link of document.querySelectorAll('a[href^="/library/"]')) {
		const href = link.getAttribute("href") ?? "";
		const colon = href.indexOf(":");
		if (colon === -1) continue;
		const tag = href.slice(colon + 1);
		if (!tag || byTag.has(tag)) continue;

		const row = link.closest("div.group") ?? link;
		const text = row.textContent ?? "";
		const digest = row.querySelector("span.font-mono")?.textContent?.trim() ?? "";
		const size = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)\b/i);
		const context = text.match(/(\d+(?:\.\d+)?)\s*([KM])\s+context window/i);

		byTag.set(tag, {
			tag,
			digest: /^[0-9a-f]{12}$/.test(digest) ? digest : null,
			sizeGb: size?.[1] && size[2] ? parseSizeGb({ value: Number(size[1]), unit: size[2] }) : null,
			contextK:
				context?.[1] && context[2]
					? Number(context[1]) * (context[2].toUpperCase() === "M" ? 1024 : 1)
					: null,
		});
	}

	return [...byTag.values()];
}

function parseSizeGb({ value, unit }: { value: number; unit: string }): number {
	const gb = unit.toUpperCase() === "MB" ? value / 1024 : value;
	return Math.round(gb * 10) / 10;
}

function parseUpdatedAt(title: string | null | undefined): string | undefined {
	if (!title) return undefined;
	const date = new Date(title);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function fetchHtml(url: string): Promise<string> {
	const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15_000) });
	if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
	return res.text();
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
		for (let item = queue.shift(); item !== undefined; item = queue.shift()) {
			await fn(item);
		}
	});
	await Promise.all(workers);
}

/** Index scrape plus per-model tags pages for real sizes and parameter counts. */
async function fetchOllamaCatalog(): Promise<CatalogModel[]> {
	const models = parseCatalogHtml(await fetchHtml(LIBRARY_URL));
	const names = [...new Set(models.map((m) => m.name))];

	const tagsByName = new Map<string, ModelTagInfo[]>();
	await forEachWithConcurrency({
		items: names,
		limit: TAGS_CONCURRENCY,
		fn: async (name) => {
			try {
				tagsByName.set(
					name,
					parseTagsHtml(await fetchHtml(`https://ollama.com/library/${name}/tags`)),
				);
			} catch (error) {
				// index-derived data still renders for this model
				console.warn("Failed to scrape a model's tags page", { model: name, error });
			}
		},
	});

	return models.map((model) => {
		const tags = tagsByName.get(model.name);
		return tags ? enrichCatalogModel({ model, tags }) : model;
	});
}

let cache: { data: CatalogModel[]; fetchedAt: number } | null = null;
let refreshInFlight: Promise<CatalogModel[]> | null = null;

/**
 * Returns the catalog, re-scraping at most once per TTL. A stale cache is
 * served immediately while the refresh runs in the background; with no cache
 * at all the caller waits, degrading to an empty list on failure.
 */
export async function getCatalog(): Promise<CatalogModel[]> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

	refreshInFlight ??= fetchOllamaCatalog()
		.then((data) => {
			cache = { data, fetchedAt: Date.now() };
			return data;
		})
		.finally(() => {
			refreshInFlight = null;
		});

	if (cache) {
		refreshInFlight.catch(() => {}); // keep serving stale data if the refresh fails
		return cache.data;
	}
	try {
		return await refreshInFlight;
	} catch (error) {
		console.error("Ollama catalog scrape failed; the Library gets an empty catalog", { error });
		return [];
	}
}
