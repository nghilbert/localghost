import { z } from "zod";
import { modelSelectionSchema, samplingOptionsSchema } from "#/lib/llm-schemas";

/** Fields the catalog can sort by. "memory" is the memory a model needs to run. */
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

/** The capability tags a catalog model can have. */
const catalogCapabilitySchema = z.enum(["vision", "code", "fast"]);

/** The hardware fit levels a user can hide, worst first. */
export const hideableFitSchema = z.enum(["wont-fit", "tight"]);

/** The fit levels hidden until the user changes the filter. */
export const DEFAULT_HIDDEN_FITS: HideableFit[] = ["wont-fit"];

/** A catalog page request: paging, sorting, search, and filters. */
export const catalogQuerySchema = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortBy: catalogSortBySchema.default("pullCount"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
	search: z.string().max(200).optional(),
	/** Matches any of these licenses. Empty matches all. */
	licenses: z.array(z.string()).optional(),
	/** Matches any of these tags. Empty matches all. */
	capabilities: z.array(catalogCapabilitySchema).optional(),
	/** Fit levels to hide. */
	hiddenFits: z.array(hideableFitSchema).default(DEFAULT_HIDDEN_FITS),
});

/** A catalog page request. */
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
/** A catalog sort field. */
export type CatalogSortBy = z.infer<typeof catalogSortBySchema>;
/** A catalog capability tag. */
export type CatalogCapability = z.infer<typeof catalogCapabilitySchema>;
/** A hardware fit level the user can hide. */
export type HideableFit = z.infer<typeof hideableFitSchema>;

/** Catalog model ids to look up. */
export const catalogModelsByIdsInput = z.object({ ids: z.array(z.string()) });

/** A model's repo and the related repos whose quants to include. */
export const modelVariantsInput = z.object({
	repoId: z.string().min(1),
	siblingRepoIds: z.array(z.string()),
});

/** The `/api/models/events` query string. */
export const modelEventsQuerySchema = z.object({ endpointId: z.uuid() });

/** The sampling options a user can override per model, a subset of {@link samplingOptionsSchema}. */
export const perModelOptionsSchema = samplingOptionsSchema.pick({
	temperature: true,
	top_p: true,
	top_k: true,
	repeat_penalty: true,
	max_tokens: true,
});

/** A model setting with its overrides. */
export const upsertModelSettingInput = modelSelectionSchema.extend({
	options: perModelOptionsSchema,
});
