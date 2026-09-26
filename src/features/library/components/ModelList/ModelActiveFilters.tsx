import { XIcon } from "lucide-react";
import { cn } from "tailwind-variants";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import type { Facet } from "#/features/library/lib/facets";

type ModelActiveFiltersProps = {
	facets: Facet[];
	className?: string;
};

/** A removable chip for each active filter, including the fit filter that is on by default. */
export function ModelActiveFilters({ facets, className }: ModelActiveFiltersProps) {
	const chips = facets.flatMap((facet) =>
		facet.chips.map((chip) => ({
			key: `${facet.id}-${chip.value}`,
			label: chip.label,
			onRemove: chip.onRemove,
		})),
	);
	if (chips.length === 0) return null;

	return (
		<div className={cn("flex flex-wrap items-center gap-1.5", className)}>
			{chips.map((chip) => (
				<Badge
					key={chip.key}
					className="cursor-pointer hover:bg-(--c)/20"
					aria-label={`Remove filter: ${chip.label}`}
					render={<button type="button" onClick={chip.onRemove} />}
				>
					{chip.label}
					<XIcon />
				</Badge>
			))}
			<Button
				type="button"
				color="neutral"
				variant="quiet"
				size="sm"
				onClick={() => {
					for (const facet of facets) facet.clear();
				}}
			>
				Clear all
			</Button>
		</div>
	);
}
