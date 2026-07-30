import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon } from "lucide-react";
import {
	defaultSortDirFor,
	type ModelSort,
	SORT_FIELDS,
} from "#/routes/_authenticated/library/-lib/model-sort";
import { Button } from "#/shared/components/ui/button";
import { ButtonGroup } from "#/shared/components/ui/button-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import type { CatalogSortBy } from "#/shared/domain/model/schemas";

type ModelSortControlsProps = {
	value: ModelSort;
	onValueChange: (value: ModelSort) => void;
};

/**
 * Sort field and direction; replaces per-column header sorting now that rows aren't a table.
 *
 * The direction button's icon is the narrow/wide-bars convention (Excel, Linear, GitHub) for
 * "currently ascending" vs "currently descending" — it reflects state, so it stays legible
 * across 8 differently-shaped fields (names, dates, sizes) without an always-visible label.
 */
export function ModelSortControls({ value, onValueChange }: ModelSortControlsProps) {
	return (
		<ButtonGroup>
			<Select
				value={value.sortBy}
				onValueChange={(sortBy: CatalogSortBy | null) => {
					if (sortBy) onValueChange({ sortBy, sortDir: defaultSortDirFor(sortBy) });
				}}
			>
				<SelectTrigger className="w-auto" data-testid="model-sort-field">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{SORT_FIELDS.map((field) => (
						<SelectItem key={field.id} value={field.id}>
							{field.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Button
				type="button"
				variant="outline"
				size="icon"
				data-testid="model-sort-direction"
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
