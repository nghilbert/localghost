import { describe, expect, it } from "vitest";
import {
	defaultSortDirFor,
	formatResultRange,
	SORT_FIELDS,
} from "#/routes/_authenticated/library/-lib/model-sort";
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

describe("formatResultRange", () => {
	it("summarizes the first page", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, rowCount: 24, total: 100 })).toBe(
			"Showing 1–24 of 100 models",
		);
	});

	it("summarizes a later, partial last page", () => {
		expect(formatResultRange({ page: 4, pageSize: 24, rowCount: 4, total: 100 })).toBe(
			"Showing 97–100 of 100 models",
		);
	});

	it("summarizes a single page that isn't full", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, rowCount: 6, total: 6 })).toBe(
			"Showing 1–6 of 6 models",
		);
	});

	it("is null when there are no results", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, rowCount: 0, total: 0 })).toBeNull();
	});
});
