import type { CatalogModel, InstalledModel, PullProgress } from "#/shared/domain/model/types";

export type ModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	installed: InstalledModel | null;
	pullState: PullProgress | undefined;
};

/** Builds Library rows from the catalog page, installed models, and downloads.
 * `catalogById` enriches off-page rows; `includeOffPageInstalled` controls whether
 * installed and downloading models outside the current catalog page are included.
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
		for (const id of pullingById.keys()) ids.add(id);
	}

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
