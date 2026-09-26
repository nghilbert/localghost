import { SlidersHorizontalIcon } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Menu } from "#/components/ui/menu";
import type { Facet } from "#/features/library/lib/facets";

type ModelFilterMenuProps = {
	facets: Facet[];
	/** Menu content drawn above the facets, such as the status choice. */
	children?: ReactNode;
};

/** The catalog filters as grouped checkboxes. A filter with no options is skipped. */
export function ModelFilterMenu({ facets, children }: ModelFilterMenuProps) {
	const activeCount = facets.reduce((total, facet) => total + facet.chips.length, 0);
	const groups = facets.filter((facet) => facet.controls.length > 0);

	return (
		<Menu.Root>
			<Menu.Trigger render={<Button type="button" color="neutral" variant="outlined" />}>
				<SlidersHorizontalIcon />
				Filter
				{activeCount > 0 && <Badge className="tabular-nums">{activeCount}</Badge>}
			</Menu.Trigger>
			<Menu.Content align="end" className="w-72">
				{children && (
					<>
						{children}
						<Menu.Separator />
					</>
				)}
				{activeCount > 0 && (
					<>
						<Menu.Item
							closeOnClick={false}
							className="justify-center text-muted-fg"
							onClick={() => {
								for (const facet of facets) facet.clear();
							}}
						>
							Clear filters
						</Menu.Item>
						<Menu.Separator />
					</>
				)}
				{groups.map((facet, index) => (
					<Fragment key={facet.id}>
						{index > 0 && <Menu.Separator />}
						<Menu.Group>
							<Menu.GroupLabel>{facet.label}</Menu.GroupLabel>
							{facet.controls.map((control) => (
								<Menu.CheckboxItem
									key={control.value}
									checked={control.checked}
									onCheckedChange={control.onToggle}
								>
									{control.label}
								</Menu.CheckboxItem>
							))}
						</Menu.Group>
					</Fragment>
				))}
			</Menu.Content>
		</Menu.Root>
	);
}
