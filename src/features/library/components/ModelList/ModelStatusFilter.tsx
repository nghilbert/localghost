import { Menu } from "#/components/ui/menu";
import { modelStatusSchema, type ModelStatus } from "#/features/library/library.schemas";
import { formatNumber } from "#/lib/format";

const STATUS_LABELS: Record<ModelStatus, string> = {
	all: "All",
	installed: "Installed",
	available: "Available",
};

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
					const parsed = modelStatusSchema.safeParse(next);
					if (parsed.success) onValueChange(parsed.data);
				}}
			>
				{modelStatusSchema.options.map((status) => (
					<Menu.RadioItem key={status} value={status}>
						{STATUS_LABELS[status]}
						<span className="ml-auto text-muted-fg tabular-nums">
							{formatNumber(counts[status])}
						</span>
					</Menu.RadioItem>
				))}
			</Menu.RadioGroup>
		</Menu.Group>
	);
}
