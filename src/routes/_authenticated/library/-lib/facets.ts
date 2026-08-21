import { FIT_LABELS, HIDEABLE_FITS } from "#/routes/_authenticated/library/-lib/fit-filter";
import type { CatalogCapability, HideableFit } from "#/shared/domain/model/schemas";

/** The finite capability filter set, in menu order. */
const CAPABILITY_OPTIONS: { value: CatalogCapability; label: string }[] = [
	{ value: "vision", label: "Vision" },
	{ value: "code", label: "Code" },
	{ value: "fast", label: "Fast" },
];

function capabilityLabel(capability: CatalogCapability): string {
	return CAPABILITY_OPTIONS.find((option) => option.value === capability)?.label ?? capability;
}

/** One selectable value inside a facet, ready to render as a menu checkbox. */
export type FacetControl = {
	value: string;
	label: string;
	checked: boolean;
	onToggle: (checked: boolean) => void;
};

/** A currently-selected facet value, ready to render as a dismissible chip. */
export type FacetChip = {
	value: string;
	label: string;
	onRemove: () => void;
};

/**
 * One filterable dimension of the catalog, projected for rendering. Owns no state: the
 * menu ({@link FacetControl}s) and active chips ({@link FacetChip}s) are two views of the
 * caller's live selection, and every change calls back.
 */
export type Facet = {
	id: string;
	label: string;
	/** Slug for `data-testid`s, e.g. `model-filter-${testId}-${value}`. */
	testId: string;
	controls: FacetControl[];
	chips: FacetChip[];
	clear: () => void;
};

function toggle<T>(values: T[], value: T, on: boolean): T[] {
	return on ? [...values, value] : values.filter((current) => current !== value);
}

type FacetSpec<T extends string> = {
	id: string;
	label: string;
	testId: string;
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
	testId,
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
		testId,
		controls: optionValues.map((value) => ({
			value,
			label: renderOption(labelFor(value)),
			checked: values.includes(value),
			onToggle: (checked) => onChange(toggle(values, value, checked)),
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

/**
 * Assemble the Library catalog's filter facets from the current selection and its
 * setters. Fit is inverted (the user hides bands), so its menu and chip wording differ;
 * license options are the catalog page's dynamic set.
 */
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
			testId: "hide",
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
			testId: "capability",
			optionValues: CAPABILITY_OPTIONS.map((option) => option.value),
			values: capabilities,
			onChange: onCapabilitiesChange,
			labelFor: capabilityLabel,
		}),
		buildFacet({
			id: "license",
			label: "License",
			testId: "license",
			optionValues: availableLicenses,
			values: licenses,
			onChange: onLicensesChange,
			labelFor: (license) => license,
		}),
	];
}
