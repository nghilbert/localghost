import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import { FitBadge } from "#/features/library/components/ModelTable/FitBadge";
import { ModelActionsCell } from "#/features/library/components/ModelTable/ModelActionsCell";
import {
	pickRecommendedModels,
	type RecommendationReason,
} from "#/features/library/lib/recommendations";
import type {
	CatalogModel,
	HardwareInfo,
	OllamaInstalledModel,
	PullProgress,
} from "#/features/library/lib/types";

const REASON_LABELS: Record<RecommendationReason, string> = {
	"best-overall": "Best overall",
	fastest: "Fastest",
	"best-coding": "Best for coding",
};

type RecommendedModelsProps = {
	catalog: CatalogModel[];
	hardware: HardwareInfo | undefined;
	installedModels: OllamaInstalledModel[];
	pulling: Record<string, PullProgress>;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
};

export function RecommendedModels({
	catalog,
	hardware,
	installedModels,
	pulling,
	onPull,
	onStop,
}: RecommendedModelsProps) {
	if (!hardware) return null;

	const recommendations = pickRecommendedModels({
		hw: hardware,
		installed: installedModels,
		catalog,
	});
	if (recommendations.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recommended first models</CardTitle>
				<CardDescription>
					Picked for your hardware. Pull one to start chatting with a local model.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ItemGroup>
					{recommendations.map(({ model, fit, reason }) => (
						<Item key={model.id} variant="outline">
							<ItemContent>
								<ItemTitle>
									{model.name} <span className="text-muted-foreground">{model.id}</span>
									<Badge className="bg-primary/10 text-primary" variant="secondary">
										{REASON_LABELS[reason]}
									</Badge>
								</ItemTitle>
								<ItemDescription>{model.description}</ItemDescription>
							</ItemContent>
							<ItemActions>
								<FitBadge tier={fit.tier} overall={fit.overall} />
								<ModelActionsCell
									modelId={model.id}
									installed={null}
									pullState={pulling[model.id]}
									onStop={onStop}
									onPull={onPull}
								/>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			</CardContent>
		</Card>
	);
}
