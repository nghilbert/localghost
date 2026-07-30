import { SlidersHorizontalIcon } from "lucide-react";
import { useId } from "react";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { Checkbox } from "#/shared/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "#/shared/components/ui/popover";
import { ScrollArea } from "#/shared/components/ui/scroll-area";
import { Separator } from "#/shared/components/ui/separator";
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

function FilterOption({
	label,
	checked,
	testId,
	onCheckedChange,
}: {
	label: string;
	checked: boolean;
	testId: string;
	onCheckedChange: (checked: boolean) => void;
}) {
	const id = useId();
	return (
		<label
			htmlFor={id}
			className="flex cursor-pointer items-center gap-3 rounded-sm p-2 hover:bg-muted"
		>
			<Checkbox id={id} checked={checked} data-testid={testId} onCheckedChange={onCheckedChange} />
			<span className="truncate">{label}</span>
		</label>
	);
}

/** Multi-select catalog facets behind one toolbar button. */
export function ModelFilterMenu({
	licenses,
	selectedLicenses,
	selectedCapabilities,
	onLicensesChange,
	onCapabilitiesChange,
}: ModelFilterMenuProps) {
	const activeCount = selectedLicenses.length + selectedCapabilities.length;

	return (
		<Popover>
			<PopoverTrigger
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
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-2">
				<div className="flex items-center justify-between gap-2 px-2 py-1">
					<span className="font-medium">Filters</span>
					{activeCount > 0 && (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							data-testid="model-filter-clear"
							onClick={() => {
								onLicensesChange([]);
								onCapabilitiesChange([]);
							}}
						>
							Clear filters
						</Button>
					)}
				</div>

				<Separator />

				<p className="px-2 pt-1 text-xs font-medium text-muted-foreground">Capabilities</p>
				<div className="space-y-1">
					{CAPABILITY_OPTIONS.map((option) => (
						<FilterOption
							key={option.value}
							label={option.label}
							checked={selectedCapabilities.includes(option.value)}
							testId={`model-filter-capability-${option.value}`}
							onCheckedChange={(checked) =>
								onCapabilitiesChange(
									checked
										? [...selectedCapabilities, option.value]
										: selectedCapabilities.filter((value) => value !== option.value),
								)
							}
						/>
					))}
				</div>

				{licenses.length > 0 && (
					<>
						<Separator />
						<p className="px-2 pt-1 text-xs font-medium text-muted-foreground">License</p>
						<ScrollArea className="max-h-52">
							<div className="space-y-1 pr-3">
								{licenses.map((license) => (
									<FilterOption
										key={license}
										label={license}
										checked={selectedLicenses.includes(license)}
										testId={`model-filter-license-${license}`}
										onCheckedChange={(checked) =>
											onLicensesChange(
												checked
													? [...selectedLicenses, license]
													: selectedLicenses.filter((value) => value !== license),
											)
										}
									/>
								))}
							</div>
						</ScrollArea>
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
