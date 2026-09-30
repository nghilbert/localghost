import type { CatalogSortBy, HideableFit } from "#/features/library/library.schemas";
import type { CatalogModel, HardwareInfo } from "#/features/library/library.types";
import { classifyHardwareFit, requiredMemoryGb } from "./hardware-fit";

/** The fields a catalog model sorts by. An installed model without a catalog entry fills what it knows. */
export type SortableModel = Pick<
	CatalogModel,
	"displayName" | "paramB" | "sizeGb" | "pullCount" | "likes" | "updatedAt" | "createdAt"
>;

/** The value a model sorts by. A missing number sorts as the smallest. */
function sortValue({ model, sortBy }: { model: SortableModel; sortBy: CatalogSortBy }) {
	switch (sortBy) {
		case "name":
			return model.displayName.toLowerCase();
		case "paramB":
			return model.paramB ?? Number.NEGATIVE_INFINITY;
		case "sizeGb":
			return model.sizeGb ?? Number.NEGATIVE_INFINITY;
		case "pullCount":
			return model.pullCount;
		case "likes":
			return model.likes;
		case "updatedAt":
			return model.updatedAt ?? "";
		case "createdAt":
			return model.createdAt ?? "";
		case "memory":
			return requiredMemoryGb(model) ?? Number.NEGATIVE_INFINITY;
	}
}

/** Orders two models by a sort field and direction; the catalog server and the list both use it. */
export function compareModels({
	left,
	right,
	sortBy,
	sortDir,
}: {
	left: SortableModel;
	right: SortableModel;
	sortBy: CatalogSortBy;
	sortDir: "asc" | "desc";
}): number {
	const a = sortValue({ model: left, sortBy });
	const b = sortValue({ model: right, sortBy });
	const dir = sortDir === "asc" ? 1 : -1;
	if (a < b) return -dir;
	if (a > b) return dir;
	return 0;
}

/** The text a catalog model is fuzzy-searched by. */
export function catalogSearchText(model: Pick<CatalogModel, "displayName" | "name" | "tags">) {
	return `${model.displayName} ${model.name} ${model.tags.join(" ")}`;
}

/** Whether a model's fit is one the user hid. Unknown hardware hides nothing. */
export function isFitHidden({
	model,
	hardware,
	hiddenFits,
}: {
	model: Pick<CatalogModel, "sizeGb" | "paramB">;
	hardware: HardwareInfo | undefined;
	hiddenFits: HideableFit[];
}): boolean {
	const fit = classifyHardwareFit({ requiredGb: requiredMemoryGb(model), hardware });
	return hiddenFits.some((hidden) => hidden === fit);
}
