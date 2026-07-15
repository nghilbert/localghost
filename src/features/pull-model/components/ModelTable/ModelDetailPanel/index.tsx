import { Trash2Icon } from "lucide-react";
import { ModelSettingsForm } from "#/features/pull-model/components/ModelTable/ModelSettingsForm";
import type { ModelRow } from "#/features/pull-model/lib/model-rows";
import type { HardwareInfo, PullProgress } from "#/features/pull-model/lib/types";
import { Badge } from "#/shared/ui/badge";
import { Button } from "#/shared/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/ui/card";
import { ModelVariantCard } from "./ModelVariantCard";

type ModelDetailPanelProps = {
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	/** The local Ollama endpoint's id; scopes the per-model settings this panel edits. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
	onDelete: (model: string) => void;
};

/** A model row's expanded overview and exact-model actions. */
export function ModelDetailPanel({
	row,
	hardware,
	pulling,
	endpointId,
	onPull,
	onStop,
	onDismiss,
	onDelete,
}: ModelDetailPanelProps) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<ModelOverviewCard row={row} />
			{row.installed ? (
				<ModelSettingsCard endpointId={endpointId} modelId={row.id} onDelete={onDelete} />
			) : (
				<ModelVariantCard
					catalog={row.catalog}
					fallbackModelId={row.id}
					fallbackPullState={row.pullState}
					hardware={hardware}
					pulling={pulling}
					onPull={onPull}
					onStop={onStop}
					onDismiss={onDismiss}
				/>
			)}
		</div>
	);
}

/** The model's identity and what it can do; every number here already has a column. */
function ModelOverviewCard({ row }: { row: ModelRow }) {
	const { catalog, installed } = row;
	const localFacts = installed && [installed.family, installed.quantizationLevel].filter(Boolean);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{row.id}</CardTitle>
				<CardDescription>
					{catalog?.description || "Installed model metadata reported by Ollama."}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				{catalog && catalog.capabilities.length > 0 && (
					<div className="flex flex-wrap gap-1" data-testid="model-detail-capabilities">
						{catalog.capabilities.map((capability) => (
							<Badge key={capability} variant="outline">
								{capability}
							</Badge>
						))}
					</div>
				)}
				{localFacts && localFacts.length > 0 && (
					<p className="text-xs text-muted-foreground">{localFacts.join(" · ")}</p>
				)}
			</CardContent>
		</Card>
	);
}

function ModelSettingsCard({
	endpointId,
	modelId,
	onDelete,
}: {
	endpointId: string;
	modelId: string;
	onDelete: (model: string) => void;
}) {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Model settings</CardTitle>
				<CardDescription>These generation overrides apply only to {modelId}.</CardDescription>
			</CardHeader>
			<CardContent>
				<ModelSettingsForm endpointId={endpointId} model={modelId} showNumCtx />
			</CardContent>
			<CardFooter className="justify-end">
				<Button
					type="button"
					variant="destructive"
					size="sm"
					data-testid="model-delete-button"
					onClick={() => onDelete(modelId)}
				>
					<Trash2Icon data-icon="inline-start" />
					Delete model
				</Button>
			</CardFooter>
		</Card>
	);
}
