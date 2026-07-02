import { parseHTML } from "linkedom";
import { deriveTags, estimateFootprint, parseParamB } from "#/features/library/lib/catalog";
import type { CatalogModel } from "#/features/library/lib/types";

const LIBRARY_URL = "https://ollama.com/library?sort=popular";
const CACHE_TTL_MS = 6 * 60 * 60_000;

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
			const footprint = paramB !== null ? estimateFootprint({ paramB }) : { vramGb: 0, ramGb: 0 };
			models.push({
				id: size ? `${name}:${size}` : name,
				name,
				paramB,
				vramGb: footprint.vramGb,
				ramGb: footprint.ramGb,
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

function parseUpdatedAt(title: string | null | undefined): string | undefined {
	if (!title) return undefined;
	const date = new Date(title);
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

async function fetchOllamaCatalog(): Promise<CatalogModel[]> {
	const res = await fetch(LIBRARY_URL, {
		headers: { "User-Agent": "Mozilla/5.0 (compatible; localghost/1.0)" },
		signal: AbortSignal.timeout(15_000),
	});
	if (!res.ok) throw new Error(`ollama.com/library returned HTTP ${res.status}`);
	return parseCatalogHtml(await res.text());
}

let cache: { data: CatalogModel[]; fetchedAt: number } | null = null;

/**
 * Returns the catalog, scraping ollama.com/library at most once per TTL. On a
 * fetch failure the last good cache is served if we have one, otherwise an empty
 * list so Browse degrades to a clean empty state rather than throwing.
 */
export async function getCatalog(): Promise<CatalogModel[]> {
	if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) return cache.data;
	try {
		const data = await fetchOllamaCatalog();
		cache = { data, fetchedAt: Date.now() };
		return data;
	} catch {
		return cache?.data ?? [];
	}
}
