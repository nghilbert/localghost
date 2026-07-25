import type { CatalogModel, InstalledModel, PullProgress } from "#/shared/domain/model/types";

export type ModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	installed: InstalledModel | null;
	pullState: PullProgress | undefined;
};

/**
 * Unions the catalog with installed models and in-flight downloads into one
 * row per model id; the single source of rows for the Library table. Off-catalog
 * installs still surface, carrying llama.cpp's own metadata.
 */
export function buildModelRows({
	catalog,
	installedModels,
	pulling,
}: {
	catalog: CatalogModel[];
	installedModels: InstalledModel[];
	pulling: Record<string, PullProgress>;
}): ModelRow[] {
	const catalogById = new Map(catalog.map((model) => [model.id, model]));
	const installedById = new Map(installedModels.map((m) => [m.id, m]));
	const pullingById = new Map(Object.entries(pulling));

	const ids = new Set([...catalogById.keys(), ...installedById.keys(), ...pullingById.keys()]);

	return [...ids].map((id) => {
		const model = catalogById.get(id) ?? null;
		return {
			id,
			name: model?.name ?? id,
			catalog: model,
			installed: installedById.get(id) ?? null,
			pullState: pullingById.get(id),
		};
	});
}
