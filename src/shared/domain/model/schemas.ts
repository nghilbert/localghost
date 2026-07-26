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

export const catalogQuerySchema = z.object({
	page: z.number().int().min(0).default(0),
	pageSize: z.number().int().min(1).max(100).default(25),
	sortBy: catalogSortBySchema.default("pullCount"),
	sortDir: z.enum(["asc", "desc"]).default("desc"),
	search: z.string().max(200).optional(),
	license: z.string().optional(),
});

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogSortBy = z.infer<typeof catalogSortBySchema>;

export const catalogModelsByIdsInput = z.object({ ids: z.array(z.string()) });
