import { computeFit } from "#/features/library/lib/catalog";
import type {
	CatalogModel,
	FitScore,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/library/lib/types";

export type ModelRow = {
	id: string;
	name: string;
	catalog: CatalogModel | null;
	fit: FitScore | null;
	installed: OllamaInstalledModel | null;
	pullState: PullProgress | undefined;
};

/** Strips Ollama's implicit `:latest` so bare-name catalog ids match installs. */
function normalizeId(id: string): string {
	return id.replace(/:latest$/, "");
}

/**
 * Unions the catalog with installed models and in-flight pulls into one row per
 * model id; the single source of rows for both Browse and My Models. Off-catalog
 * installs still surface, carrying Ollama's own metadata.
 */
export function buildModelRows({
	catalog,
	installedModels,
	pulling,
	hardware,
}: {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	hardware: HardwareInfo | undefined;
}): ModelRow[] {
	const catalogById = new Map(catalog.map((model) => [normalizeId(model.id), model]));
	const installedById = new Map(installedModels.map((m) => [normalizeId(m.name), m]));

	const ids = new Set([
		...catalogById.keys(),
		...installedById.keys(),
		...Object.keys(pulling).map(normalizeId),
	]);

	return [...ids].map((id) => {
		const model = catalogById.get(id) ?? null;
		const fit =
			model && model.paramB !== null && hardware ? computeFit({ model, hw: hardware }) : null;
		return {
			id,
			name: model?.name ?? id,
			catalog: model,
			fit,
			installed: installedById.get(id) ?? null,
			pullState: pulling[id],
		};
	});
}
