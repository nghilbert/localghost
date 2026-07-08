import { ModelActionsCell } from "#/features/pull-model/components/ModelTable/ModelActionsCell";
import { parsePullCount, Q4_GB_PER_B } from "#/features/pull-model/lib/catalog";
import type {
	CatalogModel,
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

type RecommendedModelProps = {
	catalog: CatalogModel[];
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
};

export function RecommendedModel({
	catalog,
	installedModels,
	pulling,
	onPull,
	onStop,
	onDismiss,
}: RecommendedModelProps) {
	const installedIds = new Set(installedModels.map((m) => m.name.replace(/:latest$/, "")));

	const RecommendedModel = catalog
		.filter((model) => !model.tags.includes("embedding") && !installedIds.has(model.id))
		.sort(byAll)[0];

	if (!RecommendedModel) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended first model</CardTitle>
				<CardDescription>
					Picked for your hardware. Pull it to start chatting with a local model.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ItemGroup>
					<Item variant="outline">
						<ItemContent>
							<ItemTitle>
								{RecommendedModel.name}
								<span className="text-muted-foreground">{RecommendedModel.id}</span>
							</ItemTitle>
							<ItemDescription>{RecommendedModel.description}</ItemDescription>
						</ItemContent>
						<ItemActions>
							<ModelActionsCell
								modelId={RecommendedModel.id}
								installed={null}
								pullState={pulling[RecommendedModel.id]}
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
