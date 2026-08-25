import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Fragment } from "react";
import type { Facet } from "#/routes/_authenticated/library/-lib/facets";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/shared/components/ui/dropdown-menu";

type ModelFilterMenuProps = {
	facets: Facet[];
	children?: ReactNode;
};

/** Renders the catalog's filter facets as grouped checkboxes; a facet with no options is skipped. */
export function ModelFilterMenu({ facets, children }: ModelFilterMenuProps) {
	const activeCount = facets.reduce((total, facet) => total + facet.chips.length, 0);
	const groups = facets.filter((facet) => facet.controls.length > 0);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button type="button" variant="outline" data-testid="model-filter-trigger" />}
			>
				<SlidersHorizontalIcon data-icon="inline-start" />
				Filter
				{activeCount > 0 && (
					<Badge
						variant="secondary"
						className="px-1.5 py-0 text-xs tabular-nums"
						data-testid="model-filter-count"
					>
						{activeCount}
					</Badge>
				)}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{children}
				<DropdownMenuSeparator />
				{activeCount > 0 && (
					<>
						<DropdownMenuItem
							closeOnClick={false}
							data-testid="model-filter-clear"
							className="justify-center text-muted-foreground"
							onClick={() => {
								for (const facet of facets) facet.clear();
							}}
						>
							Clear filters
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				{groups.map((facet, index) => (
					<Fragment key={facet.id}>
						{index > 0 && <DropdownMenuSeparator />}
						<DropdownMenuGroup>
							<DropdownMenuLabel>{facet.label}</DropdownMenuLabel>
							{facet.controls.map((control) => (
								<DropdownMenuCheckboxItem
									key={control.value}
									checked={control.checked}
									data-testid={`model-filter-${facet.testId}-${control.value}`}
									onCheckedChange={control.onToggle}
								>
									{control.label}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuGroup>
					</Fragment>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
