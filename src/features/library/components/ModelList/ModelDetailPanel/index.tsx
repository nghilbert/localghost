import { Link } from "@tanstack/react-router";
import { SlidersHorizontalIcon, Trash2Icon } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ButtonLink } from "#/components/ui/button-link";
import { Card } from "#/components/ui/card";
import type { ModelRow } from "#/features/library/lib/model-rows";
import type {
	HardwareInfo,
	ModelVariantInfo,
	PullProgress,
} from "#/features/library/library.types";
import { formatCount } from "#/lib/format";
import { ModelVariantCard } from "./ModelVariantCard";

type ModelDetailPanelProps = {
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	pulling: Record<string, PullProgress>;
	/** The local llama.cpp endpoint, for the link to this model's settings. */
	endpointId: string;
	/** Every quant from all of the model's repos, once loaded. */
	fetchedVariants: ModelVariantInfo[] | undefined;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDelete: (model: string) => void;
};

/** A model's details and quants, shown when its row expands. */
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
		<div className="col-span-full grid gap-3 lg:grid-cols-2">
			<ModelOverviewCard row={row} />
			{row.installed && (
				<InstalledModelCard endpointId={endpointId} modelId={row.id} onDelete={onDelete} />
			)}
			<ModelVariantCard
				catalog={row.catalog}
				fallbackModelId={row.id}
				fallbackPullState={row.pullState}
				hardware={hardware}
				pulling={pulling}
				fetchedVariants={fetchedVariants}
				installedModelId={row.installed?.id ?? null}
				onPull={onPull}
				onStop={onStop}
				className={row.installed ? "lg:col-span-2" : undefined}
			/>
		</div>
	);
}

type OverviewFact = { label: string; value: string };

/** The model's name, Hugging Face details, and capabilities. */
function ModelOverviewCard({ row }: { row: ModelRow }) {
	const { catalog, installed, id } = row;
	const localFacts =
		installed &&
		[installed.quant, installed.paramB ? formatCount(installed.paramB * 1e9) : null].filter(
			Boolean,
		);
	const facts = catalog ? buildOverviewFacts(catalog) : [];
	const caption =
		catalog?.description || (installed ? "Installed model metadata reported by llama.cpp." : null);

	return (
		<Card.Root size="sm">
			<Card.Header>
				<Card.Title>{catalog?.displayName || id}</Card.Title>
				<Card.Description className="truncate font-mono text-xs">{id}</Card.Description>
			</Card.Header>
			<Card.Content className="space-y-3">
				{facts.length > 0 && (
					<dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
						{facts.map((fact) => (
							<div key={fact.label} className="min-w-0">
								<dt className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
									{fact.label}
								</dt>
								<dd className="truncate text-sm font-medium">{fact.value}</dd>
							</div>
						))}
					</dl>
				)}
				{catalog && catalog.capabilities.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{catalog.capabilities.map((capability) => (
							<Badge key={capability} variant="outlined">
								{capability}
							</Badge>
						))}
					</div>
				)}
				{localFacts && localFacts.length > 0 && (
					<p className="text-xs text-muted-fg">{localFacts.join(" · ")}</p>
				)}
				{caption && <p className="text-xs text-muted-fg">{caption}</p>}
			</Card.Content>
		</Card.Root>
	);
}

/** The model's known facts, most important first. */
function buildOverviewFacts(catalog: NonNullable<ModelRow["catalog"]>): OverviewFact[] {
	const facts: (OverviewFact | null)[] = [
		catalog.author ? { label: "Author", value: catalog.author } : null,
		catalog.license ? { label: "License", value: catalog.license } : null,
		catalog.contextK ? { label: "Context", value: `${catalog.contextK}K tokens` } : null,
		{ label: "Pulls", value: formatCount(catalog.pullCount) },
		catalog.likes > 0 ? { label: "Likes", value: formatCount(catalog.likes) } : null,
		catalog.createdAt
			? { label: "Created", value: new Date(catalog.createdAt).toLocaleDateString() }
			: null,
		catalog.updatedAt
			? { label: "Updated", value: new Date(catalog.updatedAt).toLocaleDateString() }
			: null,
	];
	return facts.filter((fact): fact is OverviewFact => fact !== null);
}

/** Links to the model's sampling overrides in Settings, and deletes the model. */
function InstalledModelCard({
	endpointId,
	modelId,
	onDelete,
}: {
	endpointId: string;
	modelId: string;
	onDelete: (model: string) => void;
}) {
	return (
		<Card.Root size="sm">
			<Card.Header>
				<Card.Title>Installed</Card.Title>
				<Card.Description>
					Sampling overrides for {modelId} are in Settings, next to your other models.
				</Card.Description>
			</Card.Header>
			<Card.Footer className="justify-between">
				<ButtonLink
					color="neutral"
					variant="outlined"
					size="sm"
					render={<Link to="/settings/models" search={{ endpointId, model: modelId }} />}
				>
					<SlidersHorizontalIcon />
					Model settings
				</ButtonLink>
				<Button type="button" color="danger" size="sm" onClick={() => onDelete(modelId)}>
					<Trash2Icon />
					Delete model
				</Button>
			</Card.Footer>
		</Card.Root>
	);
}
