import { describe, expect, it } from "vitest";
import { catalogSortBySchema } from "#/features/library/library.schemas";
import { SORT_FIELDS } from "./model-sort";

describe("SORT_FIELDS", () => {
	it("covers exactly the schema's sortable fields", () => {
		expect(SORT_FIELDS.map((field) => field.id).sort()).toEqual(
			[...catalogSortBySchema.options].sort(),
		);
	});
});
