import { ToggleGroup, ToggleGroupItem } from "#/shared/components/ui/toggle-group";

const MODEL_STATUSES = ["all", "installed", "available"] as const;

export type ModelStatus = (typeof MODEL_STATUSES)[number];

const STATUS_LABELS: Record<ModelStatus, string> = {
	all: "All",
	installed: "Installed",
	available: "Available",
};

function isModelStatus(value: string): value is ModelStatus {
	return MODEL_STATUSES.some((status) => status === value);
}

type ModelStatusFilterProps = {
	value: ModelStatus;
	/** Counts per tab; the "all"/"available" tabs report the server's total, "installed" the local count. */
	counts: Record<ModelStatus, number>;
	onValueChange: (value: ModelStatus) => void;
};

/** Segmented control for installed and not-yet-installed model views.
 * Reports counts because installed models use a different row set from the catalog.
 */
export function ModelStatusFilter({ value, counts, onValueChange }: ModelStatusFilterProps) {
	return (
		<ToggleGroup
			variant="outline"
			spacing={0}
			value={[value]}
			onValueChange={([next]) => {
				if (!next || !isModelStatus(next)) return;
				onValueChange(next);
			}}
		>
			{MODEL_STATUSES.map((status) => (
				<ToggleGroupItem key={status} value={status} data-testid={`model-status-${status}`}>
					{STATUS_LABELS[status]}
					<span className="text-muted-foreground tabular-nums">{counts[status]}</span>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}
