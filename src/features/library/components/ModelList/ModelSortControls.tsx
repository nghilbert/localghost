import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import { Select } from "#/components/ui/select";
import { defaultSortDirFor, type ModelSort, SORT_FIELDS } from "#/features/library/lib/model-sort";
import type { CatalogSortBy } from "#/features/library/library.schemas";

type ModelSortControlsProps = {
	value: ModelSort;
	onValueChange: (value: ModelSort) => void;
};

/** The catalog's sort field and direction. The direction icon shows the current order. */
export function ModelSortControls({ value, onValueChange }: ModelSortControlsProps) {
	return (
		<ButtonGroup aria-label="Sort models">
			<Select.Root
				items={SORT_FIELDS.map((field) => ({ value: field.id, label: field.label }))}
				value={value.sortBy}
				onValueChange={(sortBy: CatalogSortBy | null) => {
					if (sortBy) onValueChange({ sortBy, sortDir: defaultSortDirFor(sortBy) });
				}}
			>
				<Select.Trigger aria-label="Sort by">
					<Select.Value />
				</Select.Trigger>
				<Select.Content>
					{SORT_FIELDS.map((field) => (
						<Select.Item key={field.id} value={field.id}>
							{field.label}
						</Select.Item>
					))}
				</Select.Content>
			</Select.Root>
			<Button
				type="button"
				color="neutral"
				variant="outlined"
				iconOnly
				aria-label={value.sortDir === "asc" ? "Sort ascending" : "Sort descending"}
				onClick={() =>
					onValueChange({ ...value, sortDir: value.sortDir === "asc" ? "desc" : "asc" })
				}
			>
				{value.sortDir === "asc" ? <ArrowUpNarrowWideIcon /> : <ArrowDownWideNarrowIcon />}
			</Button>
		</ButtonGroup>
	);
}
