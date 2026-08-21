import { parseGGUFQuantLabel, parseGgufShardFilename, RE_GGUF_FILE } from "@huggingface/gguf";
import { HubApiError, listFiles, listModels, modelInfo, type PipelineType } from "@huggingface/hub";
import { z } from "zod/v4";
import type { ModelVariantInfo } from "./types";

/**
 * Filename substrings llama.cpp's `gguf_filename_is_model` (`common/download.cpp`) excludes
 * when resolving `repo:quant` to a file. Mirrored so our size estimate never counts one.
 */
const AUXILIARY_GGUF_SUBSTRINGS = ["mmproj", "imatrix", "mtp-", "eagle3-", "dflash-", "dspark-"];

/** True for a projector/imatrix/draft file, never a chat model's own weights. */
function isAuxiliaryGgufFile(fileName: string): boolean {
	const segments = fileName.split("/");
	const basename = segments[segments.length - 1] ?? fileName;
	return AUXILIARY_GGUF_SUBSTRINGS.some((substring) => basename.includes(substring));
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
 * A `fetch` for `listModels`/`modelInfo` that additionally requests and captures the
 * GGUF fields, keyed by repo id.
 *
 * The response is returned untouched — only a clone is read — so the library still
 * parses the body itself and owns pagination. `listModels` returns an array and
 * `modelInfo` a single object; both normalize to the same map.
 */
function createExtrasCollector(): { hookedFetch: typeof fetch; extras: Map<string, IndexExtras> } {
	const extras = new Map<string, IndexExtras>();

	const hookedFetch: typeof fetch = async (input, init) => {
		const requested = input instanceof Request ? input.url : input.toString();
		const url = new URL(requested);
		if (!url.pathname.includes("/api/models")) return fetch(input, init);

		/** The Hub echoes the previous query back in its pagination Link header, so append once. */
		const expandValues = url.searchParams.getAll("expand");
		if (!expandValues.includes("gguf")) url.searchParams.append("expand", "gguf");
		if (!expandValues.includes("baseModels")) url.searchParams.append("expand", "baseModels");

		const response = await fetch(url, init);
		if (!response.ok) return response;

		const payload = await response.clone().json();
		const parsed = z
			.array(indexExtrasSchema)
			.safeParse(Array.isArray(payload) ? payload : [payload]);
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

const ADDITIONAL_FIELDS: Array<"cardData" | "tags" | "author" | "createdAt"> = [
	"cardData",
	"tags",
	"author",
	"createdAt",
];

/** A Hub model entry with our requested fields; `listModels` and `modelInfo` share this shape. */
type HubModelEntry = Awaited<ReturnType<typeof modelInfo<(typeof ADDITIONAL_FIELDS)[number]>>>;

/** Maps a Hub model entry (list or single-repo) plus its captured extras to {@link HfChatModel}. */
function toHfChatModel({
	model,
	extra,
	isVision,
}: {
	model: HubModelEntry;
	extra: IndexExtras | undefined;
	isVision: boolean;
}): HfChatModel {
	const tags = model.tags ?? [];
	const cardLicense = model.cardData?.license;
	const baseModel = model.cardData?.base_model;

	return {
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
		isVision,
	};
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
		additionalFields: ADDITIONAL_FIELDS,
		sort: "downloads",
		limit,
		fetch: hookedFetch,
		...(accessToken ? { accessToken } : {}),
	})) {
		if (model.private || model.gated) continue;
		models.push(
			toHfChatModel({
				model,
				extra: extras.get(model.name),
				isVision:
					task === "image-text-to-text" || (model.tags ?? []).includes("image-text-to-text"),
			}),
		);
	}

	return models;
}

/**
 * Fetches one GGUF repo directly, for enriching a single known id without a full
 * catalog scan (`getCatalogModelsByIds`'s cache-miss fallback).
 *
 * Returns `null` for a private, gated, or missing (404) repo.
 */
export async function getGgufChatModel({
	repoId,
	accessToken,
}: {
	repoId: string;
	accessToken: string | undefined;
}): Promise<HfChatModel | null> {
	const { hookedFetch, extras } = createExtrasCollector();

	let model: HubModelEntry;
	try {
		model = await modelInfo({
			name: repoId,
			additionalFields: ADDITIONAL_FIELDS,
			fetch: hookedFetch,
			...(accessToken ? { accessToken } : {}),
		});
	} catch (error) {
		if (error instanceof HubApiError && [401, 403, 404].includes(error.statusCode)) return null;
		throw error;
	}
	if (model.private || model.gated) return null;

	return toHfChatModel({
		model,
		extra: extras.get(model.name),
		isVision:
			model.task === "image-text-to-text" || (model.tags ?? []).includes("image-text-to-text"),
	});
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
		if (file.type !== "file" || !RE_GGUF_FILE.test(file.path) || isAuxiliaryGgufFile(file.path))
			continue;
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
