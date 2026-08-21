import { XIcon } from "lucide-react";
import type { Facet } from "#/routes/_authenticated/library/-lib/facets";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { cn } from "#/shared/lib/utils";

type ModelActiveFiltersProps = {
	facets: Facet[];
	className?: string;
};

/** A dismissible chip per active catalog filter, so a default-on filter (fit) stays visible and clearable. */
export function ModelActiveFilters({ facets, className }: ModelActiveFiltersProps) {
	const chips = facets.flatMap((facet) =>
		facet.chips.map((chip) => ({
			key: `${facet.id}-${chip.value}`,
			testId: `model-active-filter-${facet.testId}-${chip.value}`,
			label: chip.label,
			onRemove: chip.onRemove,
		})),
	);
	if (chips.length === 0) return null;

	return (
		<div
			className={cn("flex flex-wrap items-center gap-1.5", className)}
			data-testid="model-active-filters"
		>
			{chips.map((chip) => (
				<FilterChip
					key={chip.key}
					label={chip.label}
					testId={chip.testId}
					onRemove={chip.onRemove}
				/>
			))}
			<Button
				type="button"
				variant="ghost"
				size="sm"
				className="h-6 px-2 text-muted-foreground"
				data-testid="model-active-filters-clear"
				onClick={() => {
					for (const facet of facets) facet.clear();
				}}
			>
				Clear all
			</Button>
		</div>
	);
}

function FilterChip({
	label,
	testId,
	onRemove,
}: {
	label: string;
	testId: string;
	onRemove: () => void;
}) {
	return (
		<Badge
			variant="secondary"
			className="cursor-pointer hover:bg-secondary/70"
			data-testid={testId}
			render={<button type="button" onClick={onRemove} />}
		>
			{label}
			<XIcon data-icon="inline-end" />
		</Badge>
	);
}
