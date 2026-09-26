import type { CatalogCapability } from "#/features/library/library.schemas";
import type { CatalogModel, InstalledModel, PullProgress } from "#/features/library/library.types";

/** A Library row: a model with its catalog entry, install state, and download. */
export type ModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	installed: InstalledModel | null;
	pullState: PullProgress | undefined;
};

/**
 * Library rows from the catalog page, installed models, and downloads. Downloads are
 * always included; installed models off this page only with `includeOffPageInstalled`.
 */
export function buildModelRows({
	catalogPage,
	catalogById,
	installedModels,
	pulling,
	includeOffPageInstalled,
}: {
	catalogPage: CatalogModel[];
	catalogById: Map<string, CatalogModel>;
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
	includeOffPageInstalled: boolean;
}): ModelRow[] {
	const catalogPageById = new Map(catalogPage.map((model) => [model.id, model]));
	const installedById = new Map(installedModels.map((m) => [m.id, m]));
	const pullingById = new Map(Object.entries(pulling));

	const ids = new Set(catalogPageById.keys());
	if (includeOffPageInstalled) {
		for (const id of installedById.keys()) ids.add(id);
	}
	for (const id of pullingById.keys()) ids.add(id);

	return [...ids].map((id) => {
		const model = catalogPageById.get(id) ?? catalogById.get(id) ?? null;
		return {
			id,
			name: model?.name ?? id,
			catalog: model,
			installed: installedById.get(id) ?? null,
			pullState: pullingById.get(id),
		};
	});
}

/** Whether a row matches the selected catalog facets. */
export function matchesModelFacets({
	row,
	licenses,
	capabilities,
}: {
	row: ModelRow;
	licenses: string[];
	capabilities: CatalogCapability[];
}): boolean {
	if (licenses.length === 0 && capabilities.length === 0) return true;
	const catalog = row.catalog;
	if (!catalog) return false;
	if (licenses.length > 0 && (catalog.license === null || !licenses.includes(catalog.license))) {
		return false;
	}
	return (
		capabilities.length === 0 ||
		capabilities.some((capability) => catalog.tags.includes(capability))
	);
}
