import { SlidersHorizontalIcon } from "lucide-react";
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
import type { CatalogCapability } from "#/shared/domain/model/schemas";

const CAPABILITY_OPTIONS: { value: CatalogCapability; label: string }[] = [
	{ value: "vision", label: "Vision" },
	{ value: "code", label: "Code" },
	{ value: "fast", label: "Fast" },
];

type ModelFilterMenuProps = {
	licenses: string[];
	selectedLicenses: string[];
	selectedCapabilities: CatalogCapability[];
	onLicensesChange: (licenses: string[]) => void;
	onCapabilitiesChange: (capabilities: CatalogCapability[]) => void;
};

/** Facet filters for the model catalog: a fixed set of capabilities plus the catalog's dynamic licenses. */
export function ModelFilterMenu({
	licenses,
	selectedLicenses,
	selectedCapabilities,
	onLicensesChange,
	onCapabilitiesChange,
}: ModelFilterMenuProps) {
	const activeCount = selectedLicenses.length + selectedCapabilities.length;

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
				{activeCount > 0 && (
					<>
						<DropdownMenuItem
							closeOnClick={false}
							data-testid="model-filter-clear"
							className="justify-center text-muted-foreground"
							onClick={() => {
								onLicensesChange([]);
								onCapabilitiesChange([]);
							}}
						>
							Clear filters
						</DropdownMenuItem>
						<DropdownMenuSeparator />
					</>
				)}
				<DropdownMenuGroup>
					<DropdownMenuLabel>Capabilities</DropdownMenuLabel>
					{CAPABILITY_OPTIONS.map((option) => (
						<DropdownMenuCheckboxItem
							key={option.value}
							checked={selectedCapabilities.includes(option.value)}
							data-testid={`model-filter-capability-${option.value}`}
							onCheckedChange={(checked) =>
								onCapabilitiesChange(
									checked
										? [...selectedCapabilities, option.value]
										: selectedCapabilities.filter((v) => v !== option.value),
								)
							}
						>
							{option.label}
						</DropdownMenuCheckboxItem>
					))}
				</DropdownMenuGroup>
				{licenses.length > 0 && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuLabel>License</DropdownMenuLabel>
							{licenses.map((license) => (
								<DropdownMenuCheckboxItem
									key={license}
									checked={selectedLicenses.includes(license)}
									data-testid={`model-filter-license-${license}`}
									onCheckedChange={(checked) =>
										onLicensesChange(
											checked
												? [...selectedLicenses, license]
												: selectedLicenses.filter((v) => v !== license),
										)
									}
								>
									{license}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuGroup>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
