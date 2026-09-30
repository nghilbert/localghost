import { Menu } from "#/components/ui/menu";
import type { ModelStatus } from "#/features/library/library.types";

const MODEL_STATUSES = ["all", "installed", "available"] as const satisfies ModelStatus[];

const STATUS_LABELS: Record<ModelStatus, string> = {
	all: "All",
	installed: "Installed",
	available: "Available",
};

function isModelStatus(value: unknown): value is ModelStatus {
	return MODEL_STATUSES.some((status) => status === value);
}

type ModelStatusFilterProps = {
	value: ModelStatus;
	/** How many models each choice shows. */
	counts: Record<ModelStatus, number>;
	onValueChange: (value: ModelStatus) => void;
};

/** Filters the list to installed or available models, with counts. */
export function ModelStatusFilter({ value, counts, onValueChange }: ModelStatusFilterProps) {
	return (
		<Menu.Group>
			<Menu.GroupLabel>Show</Menu.GroupLabel>
			<Menu.RadioGroup
				value={value}
				onValueChange={(next) => {
					if (isModelStatus(next)) onValueChange(next);
				}}
			>
				{MODEL_STATUSES.map((status) => (
					<Menu.RadioItem key={status} value={status}>
						{STATUS_LABELS[status]}
						<span className="ml-auto text-muted-fg tabular-nums">
							{counts[status].toLocaleString()}
						</span>
					</Menu.RadioItem>
				))}
			</Menu.RadioGroup>
		</Menu.Group>
	);
}
