import { z } from "zod/v4";

/** Fields the catalog can be sorted by; "memory" is `requiredMemoryGb` computed at sort time. */
export const catalogSortBySchema = z.enum([
	"name",
	"paramB",
	"sizeGb",
	"pullCount",
	"likes",
	"updatedAt",
	"createdAt",
	"memory",
]);

/** The capability tags {@link deriveTags} can produce; the finite set the filter menu offers. */
export const catalogCapabilitySchema = z.enum(["vision", "code", "fast"]);

/** The `classifyHardwareFit` bands a user can hide, in filter-menu order (worst first). */
export const hideableFitSchema = z.enum(["wont-fit", "tight"]);

export const catalogQuerySchema = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortBy: catalogSortBySchema.default("pullCount"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
	search: z.string().max(200).optional(),
	/** A model matches when its license is any of these (OR); omit or empty to skip the facet. */
	licenses: z.array(z.string()).optional(),
	/** A model matches when it has any of these tags (OR); omit or empty to skip the facet. */
	capabilities: z.array(catalogCapabilitySchema).optional(),
	/** Fit bands to hide, keyed on the row badge's classification; defaults to hiding "wont-fit". */
	hiddenFits: z.array(hideableFitSchema).default(["wont-fit"]),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogSortBy = z.infer<typeof catalogSortBySchema>;
export type CatalogCapability = z.infer<typeof catalogCapabilitySchema>;
export type HideableFit = z.infer<typeof hideableFitSchema>;

export const llamaDownloadFileProgressSchema = z.object({
	done: z.number().nonnegative(),
	total: z.number().nonnegative(),
});

const llamaDownloadProgressEventSchema = z.object({
	model: z.string().min(1),
	event: z.literal("download_progress"),
	data: z.object({
		progress: z.record(z.string(), llamaDownloadFileProgressSchema),
	}),
});

/** Events from llama.cpp that change download progress or the cached model list. */
export const llamaModelDownloadEventSchema = z.union([
	llamaDownloadProgressEventSchema,
	z.object({
		model: z.string().min(1),
		event: z.enum([
			"model_status",
			"download_finished",
			"download_failed",
			"model_remove",
			"models_reload",
		]),
	}),
]);

export type LlamaDownloadFileProgress = z.infer<typeof llamaDownloadFileProgressSchema>;

export const catalogModelsByIdsInput = z.object({ ids: z.array(z.string()) });

export const modelVariantsInput = z.object({
	repoId: z.string().min(1),
	siblingRepoIds: z.array(z.string()),
});

export const modelEventsQuerySchema = z.object({ endpointId: z.uuid() });
