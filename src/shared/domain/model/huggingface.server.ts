import { parseGGUFQuantLabel, parseGgufShardFilename, RE_GGUF_FILE } from "@huggingface/gguf";
import { listFiles, listModels, type PipelineType } from "@huggingface/hub";
import { z } from "zod/v4";
import type { ModelVariantInfo } from "./types";

/** True for a multimodal projector file, never a chat model's own weights. */
function isMmprojFile(fileName: string): boolean {
	const segments = fileName.split("/");
	const basename = segments[segments.length - 1] ?? fileName;
	return basename.toLowerCase().startsWith("mmproj-");
}

/** The pipeline tags worth chatting with. The Hub filters on one value per query. */
export const CHAT_PIPELINE_TAGS: PipelineType[] = ["text-generation", "image-text-to-text"];

/**
 * Index metadata the Hub returns for GGUF repos that `@huggingface/hub` cannot ask
 * for: its `additionalFields` union is derived from a fixed key list that omits
 * `gguf` and `baseModels`. Both are read off the raw response as it passes through
 * `listModels`' own `fetch` seam, so they cost no extra request.
 *
 * `id` here is the repo id — the raw payload's `id`, which the library remaps to
 * `ModelEntry.name` (it puts the Hub's internal `_id` on `ModelEntry.id`).
 */
const indexExtrasSchema = z.object({
	id: z.string(),
	gguf: z
		.object({
			total: z.number().optional(),
			architecture: z.string().optional(),
			context_length: z.number().optional(),
		})
		.optional(),
	baseModels: z.object({ models: z.array(z.object({ id: z.string() })).optional() }).optional(),
});

type IndexExtras = z.infer<typeof indexExtrasSchema>;

/** One GGUF chat repo as the catalog needs it, flattened from the Hub's index. */
export type HfChatModel = {
	repoId: string;
	author: string | null;
	downloads: number;
	likes: number;
	tags: string[];
	license: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	/** Exact parameter count from the Hub's parsed GGUF header, when it published one. */
	paramTotal: number | null;
	contextLength: number | null;
	architecture: string | null;
	/** Repos this one derives from; quantizers set it on repacks, but not all do. */
	baseModelIds: string[];
	isVision: boolean;
};

/**
 * A `fetch` for `listModels` that additionally requests and captures the GGUF fields.
 *
 * The response is returned untouched — only a clone is read — so the library still
 * parses the body itself and owns pagination.
 */
function createExtrasCollector(): { hookedFetch: typeof fetch; extras: Map<string, IndexExtras> } {
	const extras = new Map<string, IndexExtras>();

	const hookedFetch: typeof fetch = async (input, init) => {
		const requested = input instanceof Request ? input.url : input.toString();
		const url = new URL(requested);
		if (!url.pathname.endsWith("/api/models")) return fetch(input, init);

		url.searchParams.append("expand", "gguf");
		url.searchParams.append("expand", "baseModels");
		const response = await fetch(url, init);
		if (!response.ok) return response;

		const parsed = z.array(indexExtrasSchema).safeParse(await response.clone().json());
		if (parsed.success) for (const entry of parsed.data) extras.set(entry.id, entry);
		return response;
	};

	return { hookedFetch, extras };
}

/** The library builds `Date`s from Hub strings, which yields an Invalid Date when one is missing. */
function toIsoString(date: Date | undefined): string | null {
	if (!date || Number.isNaN(date.getTime())) return null;
	return date.toISOString();
}

function firstLicenseTag(tags: string[]): string | null {
	const tag = tags.find((value) => value.startsWith("license:"));
	return tag ? tag.slice("license:".length) : null;
}

/** Lists popular public GGUF repos for one pipeline tag, newest metadata first. */
export async function listGgufChatModels({
	task,
	limit,
	accessToken,
}: {
	task: PipelineType;
	limit: number;
	accessToken: string | undefined;
}): Promise<HfChatModel[]> {
	const { hookedFetch, extras } = createExtrasCollector();
	const models: HfChatModel[] = [];

	for await (const model of listModels({
		search: { task, tags: ["gguf"] },
		additionalFields: ["cardData", "tags", "author", "createdAt"],
		sort: "downloads",
		limit,
		fetch: hookedFetch,
		...(accessToken ? { accessToken } : {}),
	})) {
		if (model.private || model.gated) continue;
		const extra = extras.get(model.name);
		const tags = model.tags ?? [];
		const cardLicense = model.cardData?.license;
		const baseModel = model.cardData?.base_model;

		models.push({
			repoId: model.name,
			author: model.author ?? null,
			downloads: model.downloads,
			likes: model.likes,
			tags,
			license: (typeof cardLicense === "string" ? cardLicense : null) ?? firstLicenseTag(tags),
			createdAt: model.createdAt ?? null,
			updatedAt: toIsoString(model.updatedAt),
			paramTotal: extra?.gguf?.total ?? null,
			contextLength: extra?.gguf?.context_length ?? null,
			architecture: extra?.gguf?.architecture ?? null,
			baseModelIds:
				extra?.baseModels?.models?.map((entry) => entry.id) ??
				(typeof baseModel === "string" ? [baseModel] : (baseModel ?? [])),
			isVision: task === "image-text-to-text" || tags.includes("image-text-to-text"),
		});
	}

	return models;
}

/** Every distinct GGUF quant in a repo, with sharded parts summed, ascending by size. */
export async function listGgufVariants({
	repoId,
	accessToken,
}: {
	repoId: string;
	accessToken: string | undefined;
}): Promise<ModelVariantInfo[]> {
	const files: { path: string; bytes: number }[] = [];
	for await (const file of listFiles({
		repo: { type: "model", name: repoId },
		recursive: true,
		...(accessToken ? { accessToken } : {}),
	})) {
		if (file.type !== "file" || !RE_GGUF_FILE.test(file.path) || isMmprojFile(file.path)) continue;
		files.push({ path: file.path, bytes: file.lfs?.size ?? file.size });
	}

	/** A sharded quant's download is the sum of its parts, keyed by the shared prefix. */
	const shardTotals = new Map<string, number>();
	for (const file of files) {
		const shard = parseGgufShardFilename(file.path);
		if (shard) shardTotals.set(shard.prefix, (shardTotals.get(shard.prefix) ?? 0) + file.bytes);
	}

	const variants: ModelVariantInfo[] = [];
	const seenQuants = new Set<string>();
	for (const file of files) {
		const shard = parseGgufShardFilename(file.path);
		if (shard && Number(shard.shard) !== 1) continue;
		const quant = parseGGUFQuantLabel(file.path);
		if (!quant || seenQuants.has(quant)) continue;
		seenQuants.add(quant);
		const bytes = shard ? (shardTotals.get(shard.prefix) ?? 0) : file.bytes;
		variants.push({
			quant,
			sizeGb: bytes ? Math.round((bytes / 1024 ** 3) * 10) / 10 : null,
			fileName: file.path,
			repoId,
		});
	}

	return variants.sort((a, b) => (a.sizeGb ?? 0) - (b.sizeGb ?? 0));
}
