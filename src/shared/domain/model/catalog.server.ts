import { deriveTags } from "#/routes/_authenticated/library/-lib/catalog";
import { parseParamB } from "./model-id";
import type { CatalogModel, ModelVariantInfo } from "./types";

const HF_API = "https://huggingface.co/api";
const INDEX_LIMIT = 200;
const CACHE_TTL_MS = 6 * 60 * 60_000;
const TREE_CONCURRENCY = 8;

/** GGUF filenames that aren't a chat model's own weights (multimodal projector, shards). */
const SKIP_FILE = /^mmproj-|-\d{5}-of-\d{5}\.gguf$/i;

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

/** Parses the quant out of a GGUF filename, e.g. "gemma-3-4b-it-Q4_K_M.gguf" → "Q4_K_M". */
function parseQuantFromFilename(fileName: string): string | null {
	const match = fileName.match(/[-.](Q\d[_A-Z0-9]*|IQ\d[_A-Z0-9]*|F16|F32|BF16)\.gguf$/i);
	return match?.[1]?.toUpperCase() ?? null;
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

/** GGUF variants (one per quant) found in a repo's file tree, largest first. */
async function fetchVariants(repoId: string): Promise<ModelVariantInfo[]> {
	const entries = await fetchJson<HfTreeEntry[]>(
		`${HF_API}/models/${repoId}/tree/main?recursive=true`,
	);
	const variants: ModelVariantInfo[] = [];
	for (const entry of entries) {
		if (!entry.path.toLowerCase().endsWith(".gguf")) continue;
		if (SKIP_FILE.test(entry.path)) continue;
		const quant = parseQuantFromFilename(entry.path);
		if (!quant) continue;
		const bytes = entry.lfs?.size ?? entry.size;
		variants.push({
			quant,
			sizeGb: bytes ? Math.round((bytes / 1024 ** 3) * 10) / 10 : null,
			fileName: entry.path,
		});
	}
	return variants.sort((a, b) => (b.sizeGb ?? 0) - (a.sizeGb ?? 0));
}

/** Capability hints derived from an HF repo's tags, in place of ollama.com's badges. */
function capabilitiesFromTags(tags: string[]): string[] {
	const capabilities: string[] = [];
	if (tags.includes("image-text-to-text") || tags.includes("vision")) capabilities.push("vision");
	if (tags.includes("conversational")) capabilities.push("tools");
	return capabilities;
}

/** Fetches the GGUF model index plus per-repo file trees for exact quant sizes. */
async function fetchHfCatalog(): Promise<CatalogModel[]> {
	const index = await fetchJson<HfIndexModel[]>(
		`${HF_API}/models?filter=gguf&sort=downloads&direction=-1&limit=${INDEX_LIMIT}&full=true`,
	);
	const eligible = index.filter((m) => !m.gated && !m.private);
	if (eligible.length === 0) {
		throw new Error("Hugging Face GGUF index returned 0 eligible models");
	}

	const models: CatalogModel[] = [];
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
			if (variants.length === 0) return;

			const paramB = parseParamB(repo.id);
			const capabilities = capabilitiesFromTags(repo.tags ?? []);
			const best = variants[0];
			models.push({
				id: `${repo.id}:${best?.quant ?? "latest"}`,
				name: repo.id,
				paramB,
				sizeGb: best?.sizeGb ?? null,
				contextK: null,
				tags: deriveTags({ name: repo.id, description: "", paramB, capabilities }),
				capabilities,
				description: "",
				pullCount: String(repo.downloads ?? 0),
				updated: "",
				updatedAt: repo.lastModified,
				variants,
			});
		},
	});

	return models;
}

let cache: { data: CatalogModel[]; fetchedAt: number } | null = null;
let refreshInFlight: Promise<CatalogModel[]> | null = null;

/**
 * Returns cached data immediately while an expired cache refreshes in the
 * background. With no cache, the caller waits for the fetch.
 * @throws when no cache exists and the fetch fails or returns no models
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
