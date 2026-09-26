import type { CatalogCapability, HideableFit } from "#/features/library/library.schemas";
import { FIT_LABELS, HIDEABLE_FITS } from "./hardware-fit";

/** The capability filter's options, in menu order. */
const CAPABILITY_OPTIONS: { value: CatalogCapability; label: string }[] = [
	{ value: "vision", label: "Vision" },
	{ value: "code", label: "Code" },
	{ value: "fast", label: "Fast" },
];

function capabilityLabel(capability: CatalogCapability): string {
	return CAPABILITY_OPTIONS.find((option) => option.value === capability)?.label ?? capability;
}

/** One option of a filter, as a menu checkbox. */
type FacetControl = {
	value: string;
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
};

/** A selected filter option, as a removable chip. */
type FacetChip = {
	value: string;
	label: string;
	onRemove: () => void;
};

/** One catalog filter, as menu checkboxes and chips over the caller's selection. */
export type Facet = {
	id: string;
	label: string;
	controls: FacetControl[];
	chips: FacetChip[];
	clear: () => void;
};

function toggle<T>({ values, value, on }: { values: T[]; value: T; on: boolean }): T[] {
	return on ? [...values, value] : values.filter((current) => current !== value);
}

type FacetSpec<T extends string> = {
	id: string;
	label: string;
	optionValues: T[];
	values: T[];
	onChange: (values: T[]) => void;
	labelFor: (value: T) => string;
	renderOption?: (label: string) => string;
	renderChip?: (label: string) => string;
};

function buildFacet<T extends string>({
	id,
	label,
	optionValues,
	values,
	onChange,
	labelFor,
	renderOption = (text) => text,
	renderChip = (text) => text,
}: FacetSpec<T>): Facet {
	return {
		id,
		label,
		controls: optionValues.map((value) => ({
			value,
			label: renderOption(labelFor(value)),
			checked: values.includes(value),
			onToggle: (checked) => onChange(toggle({ values, value, on: checked })),
		})),
		chips: values.map((value) => ({
			value,
			label: renderChip(labelFor(value)),
			onRemove: () => onChange(values.filter((current) => current !== value)),
		})),
		clear: () => onChange([]),
	};
}

type ModelFacetsParams = {
	availableLicenses: string[];
	hiddenFits: HideableFit[];
	capabilities: CatalogCapability[];
	licenses: string[];
	onHiddenFitsChange: (values: HideableFit[]) => void;
	onCapabilitiesChange: (values: CatalogCapability[]) => void;
	onLicensesChange: (values: string[]) => void;
};

/** The catalog filters for the current selection. The fit filter hides levels instead of choosing them. */
export function buildModelFacets({
	availableLicenses,
	hiddenFits,
	capabilities,
	licenses,
	onHiddenFitsChange,
	onCapabilitiesChange,
	onLicensesChange,
}: ModelFacetsParams): Facet[] {
	return [
		buildFacet({
			id: "hardware",
			label: "Hardware",
			optionValues: HIDEABLE_FITS,
			values: hiddenFits,
			onChange: onHiddenFitsChange,
			labelFor: (fit) => FIT_LABELS[fit],
			renderOption: (text) => `Hide "${text}"`,
			renderChip: (text) => `Hiding "${text}"`,
		}),
		buildFacet({
			id: "capabilities",
			label: "Capabilities",
			optionValues: CAPABILITY_OPTIONS.map((option) => option.value),
			values: capabilities,
			onChange: onCapabilitiesChange,
			labelFor: capabilityLabel,
		}),
		buildFacet({
			id: "license",
			label: "License",
			optionValues: availableLicenses,
			values: licenses,
			onChange: onLicensesChange,
			labelFor: (license) => license,
		}),
	];
}
