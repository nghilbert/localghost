import type { CatalogModel, OllamaInstalledModel, PullProgress } from "#/shared/domain/model/types";
import { normalizeModelId } from "#/shared/lib/utils";

export type ModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	installed: OllamaInstalledModel | null;
	pullState: PullProgress | undefined;
};

/**
 * Unions the catalog with installed models and in-flight pulls into one row per
 * model id; the single source of rows for the Library table. Off-catalog
 * installs still surface, carrying Ollama's own metadata.
 */
export function buildModelRows({
	catalog,
	installedModels,
	pulling,
}: {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
}): ModelRow[] {
	const catalogById = new Map(catalog.map((model) => [normalizeModelId(model.id), model]));
	const installedById = new Map(installedModels.map((m) => [normalizeModelId(m.name), m]));
	// Pulls are keyed by the exact string the pull started with (`llama3.1:latest`),
	// so normalize here too or a `:latest` pull never reaches its row.
	const pullingById = new Map(
		Object.entries(pulling).map(([model, state]) => [normalizeModelId(model), state]),
	);

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
