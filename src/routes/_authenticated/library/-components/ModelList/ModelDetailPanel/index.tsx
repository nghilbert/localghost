import { Trash2Icon } from "lucide-react";
import { ModelSettingsForm } from "#/routes/_authenticated/library/-components/ModelList/ModelSettingsForm";
import type { ModelRow } from "#/routes/_authenticated/library/-lib/model-rows";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { formatPullCount } from "#/shared/domain/model/hardware-fit";
import type { HardwareInfo, ModelVariantInfo, PullProgress } from "#/shared/domain/model/types";
import { ModelVariantCard } from "./ModelVariantCard";

type ModelDetailPanelProps = {
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	/** The local llama.cpp endpoint's id; scopes the per-model settings this panel edits. */
	endpointId: string;
	/** The expanded row's lazily-fetched cross-publisher variant list, once loaded. */
	fetchedVariants: ModelVariantInfo[] | undefined;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/** A model row's expanded overview and exact-model actions. */
export function ModelDetailPanel({
	row,
	hardware,
	pulling,
	endpointId,
	fetchedVariants,
	onPull,
	onStop,
	onDelete,
}: ModelDetailPanelProps) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<ModelOverviewCard row={row} />
			{row.installed ? (
				<>
					<ModelSettingsCard endpointId={endpointId} modelId={row.id} onDelete={onDelete} />
					<ModelVariantCard
						catalog={row.catalog}
						fallbackModelId={row.id}
						fallbackPullState={row.pullState}
						hardware={hardware}
						pulling={pulling}
						fetchedVariants={fetchedVariants}
						installedModelId={row.installed.id}
						onPull={onPull}
						onStop={onStop}
						className="lg:col-span-2"
					/>
				</>
			) : (
				<ModelVariantCard
					catalog={row.catalog}
					fallbackModelId={row.id}
					fallbackPullState={row.pullState}
					hardware={hardware}
					pulling={pulling}
					fetchedVariants={fetchedVariants}
					installedModelId={null}
					onPull={onPull}
					onStop={onStop}
				/>
			)}
		</div>
	);
}

type OverviewFact = { label: string; value: string };

/** The model's identity, its Hugging Face facts, and what it can do. */
function ModelOverviewCard({ row }: { row: ModelRow }) {
	const { catalog, installed, id } = row;
	const localFacts =
		installed &&
		[installed.quant, installed.paramB ? `${installed.paramB}B` : null].filter(Boolean);
	const facts = catalog ? buildOverviewFacts(catalog) : [];
	const caption =
		catalog?.description || (installed ? "Installed model metadata reported by llama.cpp." : null);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>{catalog?.displayName || id}</CardTitle>
				<CardDescription className="truncate font-mono text-xs">{id}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{facts.length > 0 && (
					<dl
						className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3"
						data-testid="model-detail-facts"
					>
						{facts.map((fact) => (
							<div key={fact.label} className="min-w-0">
								<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									{fact.label}
								</dt>
								<dd className="truncate text-sm font-medium">{fact.value}</dd>
							</div>
						))}
					</dl>
				)}
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
				{caption && <p className="text-xs text-muted-foreground">{caption}</p>}
			</CardContent>
		</Card>
	);
}

/** The overview card's facts list, in priority order, omitting anything the catalog doesn't know. */
function buildOverviewFacts(catalog: NonNullable<ModelRow["catalog"]>): OverviewFact[] {
	const facts: (OverviewFact | null)[] = [
		catalog.author ? { label: "Author", value: catalog.author } : null,
		catalog.license ? { label: "License", value: catalog.license } : null,
		catalog.contextK ? { label: "Context", value: `${catalog.contextK}K tokens` } : null,
		{ label: "Pulls", value: formatPullCount(catalog.pullCount) },
		catalog.likes > 0 ? { label: "Likes", value: formatPullCount(catalog.likes) } : null,
		catalog.createdAt
			? { label: "Created", value: new Date(catalog.createdAt).toLocaleDateString() }
			: null,
		catalog.updatedAt
			? { label: "Updated", value: new Date(catalog.updatedAt).toLocaleDateString() }
			: null,
	];
	return facts.filter((fact): fact is OverviewFact => fact !== null);
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
				<ModelSettingsForm endpointId={endpointId} model={modelId} />
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
