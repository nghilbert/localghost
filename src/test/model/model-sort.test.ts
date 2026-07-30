import { describe, expect, it } from "vitest";
import { defaultSortDirFor, SORT_FIELDS } from "#/routes/_authenticated/library/-lib/model-sort";
import { catalogSortBySchema } from "#/shared/domain/model/schemas";

describe("SORT_FIELDS", () => {
	it("covers exactly the schema's sortable fields", () => {
		expect(SORT_FIELDS.map((field) => field.id).sort()).toEqual(
			[...catalogSortBySchema.options].sort(),
		);
	});
});

describe("defaultSortDirFor", () => {
	it("defaults the will-it-fit axes to ascending", () => {
		expect(defaultSortDirFor("name")).toBe("asc");
		expect(defaultSortDirFor("sizeGb")).toBe("asc");
		expect(defaultSortDirFor("memory")).toBe("asc");
	});

	it("defaults popularity and recency fields to descending", () => {
		expect(defaultSortDirFor("paramB")).toBe("desc");
		expect(defaultSortDirFor("pullCount")).toBe("desc");
		expect(defaultSortDirFor("likes")).toBe("desc");
		expect(defaultSortDirFor("updatedAt")).toBe("desc");
		expect(defaultSortDirFor("createdAt")).toBe("desc");
	});
});
