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
		expect(formatResultRange({ page: 0, pageSize: 24, total: 100 })).toBe(
			"Showing 1–24 of 100 models",
		);
	});

	it("clamps the last page to the total instead of a full page's width", () => {
		expect(formatResultRange({ page: 4, pageSize: 24, total: 100 })).toBe(
			"Showing 97–100 of 100 models",
		);
	});

	it("summarizes a single page that isn't full", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, total: 6 })).toBe("Showing 1–6 of 6 models");
	});

	it("groups thousands so large catalogs stay readable", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, total: 1234 })).toBe(
			"Showing 1–24 of 1,234 models",
		);
	});

	it("is null when there are no results", () => {
		expect(formatResultRange({ page: 0, pageSize: 24, total: 0 })).toBeNull();
	});

	it("is null when the page is past the end, rather than inventing a backwards range", () => {
		expect(formatResultRange({ page: 5, pageSize: 24, total: 100 })).toBeNull();
	});
});
