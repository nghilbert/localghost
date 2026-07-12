import { Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ModelActionsCell } from "#/features/pull-model/components/ModelTable/ModelActionsCell";
import { ModelSettingsForm } from "#/features/pull-model/components/ModelTable/ModelSettingsForm";
import { fitsHardware, requiredMemoryGb } from "#/features/pull-model/lib/catalog";
import type { ModelRow } from "#/features/pull-model/lib/model-rows";
import type { HardwareInfo } from "#/features/pull-model/lib/types";
import { cn } from "#/shared/lib/utils";
import { Badge } from "#/shared/ui/badge";
import { Button } from "#/shared/ui/button";

type ModelDetailPanelProps = {
	row: ModelRow;
	hardware: HardwareInfo | undefined;
	/** The local Ollama endpoint's id; scopes the per-model settings this panel edits. */
	endpointId: string;
	onPull: (model: string) => void;
	onStop: (model: string) => void;
	onDismiss: (model: string) => void;
	onDelete: (model: string) => void;
};

/** A model row's expanded detail: metadata, hardware fit, variant picker, and actions. */
export function ModelDetailPanel({
	row,
	hardware,
	endpointId,
	onPull,
	onStop,
	onDismiss,
	onDelete,
}: ModelDetailPanelProps) {
	const { catalog, installed, pullState } = row;
	const variants = catalog?.variants ?? [];
	const [selectedTag, setSelectedTag] = useState(() => variants[0]?.tag);
	const selectedVariant = variants.find((v) => v.tag === selectedTag) ?? variants[0];

	const targetModel =
		catalog && selectedVariant ? `${catalog.name}:${selectedVariant.tag}` : row.id;
	const fit =
		hardware && catalog
			? fitsHardware({
					model: selectedVariant
						? { sizeGb: selectedVariant.sizeGb, paramB: catalog.paramB }
						: catalog,
					hardware,
				})
			: null;
	const required = catalog
		? requiredMemoryGb(
				selectedVariant ? { sizeGb: selectedVariant.sizeGb, paramB: catalog.paramB } : catalog,
			)
		: null;

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="space-y-3">
				{catalog?.description && (
					<p className="text-sm text-muted-foreground">{catalog.description}</p>
				)}

				{catalog && catalog.capabilities.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{catalog.capabilities.map((capability) => (
							<Badge key={capability} variant="secondary">
								{capability}
							</Badge>
						))}
					</div>
				)}

				{catalog && (
					<dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
						<dt>Pulls</dt>
						<dd className="text-right tabular-nums">{catalog.pullCount}</dd>
						<dt>Updated</dt>
						<dd className="text-right tabular-nums">{catalog.updated}</dd>
					</dl>
				)}

				{required !== null && (
					<p
						className={cn("text-xs", fit === false ? "text-destructive" : "text-muted-foreground")}
					>
						Needs ~{required} GB{fit === false ? ", likely too large for this machine" : ""}
					</p>
				)}

				{variants.length > 1 && (
					<div className="flex flex-wrap gap-1">
						{variants.map((variant) => (
							<Badge
								key={variant.tag}
								variant={variant.tag === selectedTag ? "default" : "outline"}
								className="cursor-pointer"
								onClick={(event) => {
									event.stopPropagation();
									setSelectedTag(variant.tag);
								}}
							>
								{variant.tag}
								{variant.sizeGb != null && ` · ${variant.sizeGb} GB`}
							</Badge>
						))}
					</div>
				)}
			</div>

			<div className="space-y-3">
				{installed ? (
					<>
						<ModelSettingsForm endpointId={endpointId} model={row.id} showNumCtx />
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(row.id)}
						>
							<Trash2Icon />
							Delete model
						</Button>
					</>
				) : (
					<ModelActionsCell
						modelId={targetModel}
						installed={null}
						pullState={pullState}
						onStop={onStop}
						onPull={onPull}
						onDismiss={onDismiss}
					/>
				)}
			</div>
		</div>
	);
}
