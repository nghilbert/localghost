import { ModelActionsCell } from "#/features/pull-model/components/ModelTable/ModelActionsCell";
import {
	fitsHardware,
	parsePullCount,
	Q4_GB_PER_B,
	requiredMemoryGb,
} from "#/features/pull-model/lib/catalog";
import type {
	CatalogModel,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/pull-model/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/shared/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/shared/ui/item";

function byPopularity(modelA: CatalogModel, modelB: CatalogModel): number {
	return parsePullCount(modelB.pullCount) - parsePullCount(modelA.pullCount);
}

function getEffectiveParams(model: CatalogModel): number {
	const { paramB, sizeGb } = model;
	return paramB ?? (sizeGb !== null ? sizeGb / Q4_GB_PER_B : 0);
}
function byEffectiveParams(modelA: CatalogModel, modelB: CatalogModel): number {
	return getEffectiveParams(modelB) - getEffectiveParams(modelA);
}

/** Combines all parameters: Best tier first, then popularity, then largest parameter count. */
function byAll(modelA: CatalogModel, modelB: CatalogModel): number {
	return byPopularity(modelA, modelB) || byEffectiveParams(modelA, modelB);
}

/** Smallest estimated memory need first, for the no-model-fits fallback. */
function byRequiredMemory(modelA: CatalogModel, modelB: CatalogModel): number {
	const a = requiredMemoryGb(modelA) ?? Number.POSITIVE_INFINITY;
	const b = requiredMemoryGb(modelB) ?? Number.POSITIVE_INFINITY;
	return a - b;
}

type RecommendedModelProps = {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
};

export function RecommendedModel({
	catalog,
	installedModels,
	hardware,
	pulling,
	onPull,
	onStop,
	onDismiss,
}: RecommendedModelProps) {
	const installedIds = new Set(installedModels.map((m) => m.name.replace(/:latest$/, "")));
	const candidates = catalog.filter(
		(model) => !model.tags.includes("embedding") && !installedIds.has(model.id),
	);

	// Prefer a model that actually fits the detected hardware; when none does (or
	// hardware is still loading), fall back to the full candidate pool.
	const fitting = hardware
		? candidates.filter((model) => fitsHardware({ model, hardware }))
		: candidates;
	const pool = fitting.length > 0 ? fitting : candidates;
	const picked = [...pool].sort(hardware && fitting.length === 0 ? byRequiredMemory : byAll)[0];

	if (!picked) return null;

	const fits = hardware ? fitsHardware({ model: picked, hardware }) : null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended first model</CardTitle>
				<CardDescription>
					{fits === false
						? "Every catalog model is a tight fit for your hardware; this is the smallest one."
						: fits === true
							? "Picked for your hardware. Pull it to start chatting with a local model."
							: "Pull it to start chatting with a local model."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ItemGroup>
					<Item variant="outline">
						<ItemContent>
							<ItemTitle>
								{picked.name}
								<span className="text-muted-foreground">{picked.id}</span>
							</ItemTitle>
							<ItemDescription>{picked.description}</ItemDescription>
						</ItemContent>
						<ItemActions>
							<ModelActionsCell
								modelId={picked.id}
								installed={null}
								pullState={pulling[picked.id]}
								onStop={onStop}
								onPull={onPull}
								onDismiss={onDismiss}
							/>
						</ItemActions>
					</Item>
				</ItemGroup>
			</CardContent>
		</Card>
	);
}
