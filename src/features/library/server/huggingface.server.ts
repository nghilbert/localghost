import { parseGGUFQuantLabel, parseGgufShardFilename, RE_GGUF_FILE } from "@huggingface/gguf";
import { HubApiError, listFiles, listModels, modelInfo } from "@huggingface/hub";
import { z } from "zod";
import type { ModelVariantInfo } from "#/features/library/library.types";
import { GIB, roundToTenth } from "#/lib/format";

/** Filename parts llama.cpp's `gguf_filename_is_model` skips, so sizes count model weights only. */
const AUXILIARY_GGUF_SUBSTRINGS = ["mmproj", "imatrix", "mtp-", "eagle3-", "dflash-", "dspark-"];

/** Whether a file is a projector, imatrix, or draft model instead of the model's weights. */
function isAuxiliaryGgufFile(fileName: string): boolean {
	const segments = fileName.split("/");
	const basename = segments[segments.length - 1] ?? fileName;
	return AUXILIARY_GGUF_SUBSTRINGS.some((substring) => basename.includes(substring));
}

/**
 * Fields `@huggingface/hub` cannot request (`gguf`, `baseModels`), read from the raw
 * response through its `fetch` option. `id` is the repo id, which the library calls `name`.
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

/** The extra fields of a Hub index entry, as the Hub sends them. */
export type HubIndexExtras = z.input<typeof indexExtrasSchema>;

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
 * A `fetch` for `listModels` and `modelInfo` that also requests the extra fields and
 * collects them by repo id. It reads a clone, so the library still gets the response.
 */
function createExtrasCollector(): { hookedFetch: typeof fetch; extras: Map<string, IndexExtras> } {
	const extras = new Map<string, IndexExtras>();

	const hookedFetch: typeof fetch = async (input, init) => {
		const requested = input instanceof Request ? input.url : input.toString();
		const url = new URL(requested);
		if (!url.pathname.includes("/api/models")) return fetch(input, init);

		// The next-page link repeats the query, so add each field only once.
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

/** An ISO string, or null for a missing date that the library turned into an Invalid Date. */
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

/** A Hub model entry with our requested fields. */
type HubModelEntry = Awaited<ReturnType<typeof modelInfo<(typeof ADDITIONAL_FIELDS)[number]>>>;

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

/**
 * Popular public GGUF repos by download count. Filters on the `gguf` tag alone, since many
 * GGUF repos have no pipeline tag or a non-chat one.
 */
export async function listGgufChatModels({
	limit,
	accessToken,
}: {
	limit: number;
	accessToken: string | undefined;
}): Promise<HfChatModel[]> {
	const { hookedFetch, extras } = createExtrasCollector();
	const models: HfChatModel[] = [];

	for await (const model of listModels({
		search: { tags: ["gguf"] },
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
				isVision: model.tags.includes("image-text-to-text"),
			}),
		);
	}

	return models;
}

/** One GGUF repo, or `null` when it is private, gated, or missing. */
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

	// A split quant's size is the sum of its parts.
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
			sizeGb: bytes ? roundToTenth(bytes / GIB) : null,
			fileName: file.path,
			repoId,
		});
	}

	return variants.sort((a, b) => (a.sizeGb ?? 0) - (b.sizeGb ?? 0));
}
