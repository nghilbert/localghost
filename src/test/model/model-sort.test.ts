import { describe, expect, it } from "vitest";
import { SORT_FIELDS } from "#/routes/_authenticated/library/-lib/model-sort";
import { catalogSortBySchema } from "#/shared/domain/model/schemas";

describe("SORT_FIELDS", () => {
	it("covers exactly the schema's sortable fields", () => {
		expect(SORT_FIELDS.map((field) => field.id).sort()).toEqual(
			[...catalogSortBySchema.options].sort(),
		);
	});
});
