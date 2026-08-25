import {
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
} from "#/shared/components/ui/dropdown-menu";

const MODEL_STATUSES = ["all", "installed", "available"] as const;

export type ModelStatus = (typeof MODEL_STATUSES)[number];

function isModelStatus(value: string): value is ModelStatus {
	return MODEL_STATUSES.some((status) => status === value);
}

const STATUS_LABELS: Record<ModelStatus, string> = {
	all: "All",
	installed: "Installed",
	available: "Available",
};

type ModelStatusFilterProps = {
	value: ModelStatus;
	counts: Record<ModelStatus, number>;
	onValueChange: (value: ModelStatus) => void;
};

/** Renders the Library's status choices inside the model filter menu. */
export function ModelStatusFilter({ value, counts, onValueChange }: ModelStatusFilterProps) {
	return (
		<DropdownMenuGroup>
			<DropdownMenuLabel>Show</DropdownMenuLabel>
			<DropdownMenuRadioGroup
				value={value}
				onValueChange={(nextValue) => {
					if (isModelStatus(nextValue)) onValueChange(nextValue);
				}}
			>
				{MODEL_STATUSES.map((status) => (
					<DropdownMenuRadioItem key={status} value={status} data-testid={`model-status-${status}`}>
						{STATUS_LABELS[status]}
						<span className="ml-auto text-muted-foreground tabular-nums">
							{counts[status].toLocaleString()}
						</span>
					</DropdownMenuRadioItem>
				))}
			</DropdownMenuRadioGroup>
		</DropdownMenuGroup>
	);
}
