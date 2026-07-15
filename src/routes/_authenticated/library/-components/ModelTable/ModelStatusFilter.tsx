import { ToggleGroup, ToggleGroupItem } from "#/shared/components/ui/toggle-group";

const MODEL_STATUSES = ["all", "installed", "available"] as const;

export type ModelStatus = (typeof MODEL_STATUSES)[number];

/** How many rows each status holds, before the search box narrows them further. */
export type ModelStatusCounts = Record<ModelStatus, number>;

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
	onValueChange: (value: ModelStatus) => void;
	counts: ModelStatusCounts;
};

/** Segmented control that narrows the model table to installed or not-yet-installed models. */
export function ModelStatusFilter({ value, onValueChange, counts }: ModelStatusFilterProps) {
	return (
		<ToggleGroup
			variant="outline"
			spacing={0}
			value={[value]}
			onValueChange={([next]) => {
				if (next && isModelStatus(next)) onValueChange(next);
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
