import type { ReactNode } from "react";
import {
	Combobox,
	ComboboxCollection,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from "#/shared/components/ui/combobox";
import { cn } from "#/shared/lib/utils";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps } from "./types";

/** A labelled bucket of items for the grouped variant of {@link ComboboxField}. */
export type ComboboxFieldGroup<TItem> = {
	id: string;
	label: string;
	/** Accent classes for the sticky group header (echoing each bucket's meaning). */
	labelClassName?: string;
	items: TItem[];
};

type ComboboxFieldBase<TItem> = BaseFieldProps & {
	itemToValue: (item: TItem) => string;
	itemToLabel: (item: TItem) => string;
	/** Custom item body; defaults to the label string. */
	renderItem?: (item: TItem) => ReactNode;
	placeholder?: string;
	emptyMessage?: string;
	className?: string;
};

/** Exactly one of `items` (flat) or `groups` (labelled buckets) is provided. */
export type ComboboxFieldProps<TItem> = ComboboxFieldBase<TItem> &
	({ items: TItem[]; groups?: never } | { groups: ComboboxFieldGroup<TItem>[]; items?: never });

/**
 * A searchable single-select field over arbitrary items, flat or grouped. Stores the
 * selected item's `itemToValue` string in form state, so it drops into any string field.
 */
export function ComboboxField<TItem>({
	label,
	description,
	fieldOrientation,
	items,
	groups,
	itemToValue,
	itemToLabel,
	renderItem,
	placeholder,
	emptyMessage = "No matches.",
	className,
}: ComboboxFieldProps<TItem>) {
	const field = useFieldContext<string>();
	const flatItems = groups ? groups.flatMap((group) => group.items) : (items ?? []);
	const selectedItem = flatItems.find((item) => itemToValue(item) === field.state.value) ?? null;

	const renderOption = (item: TItem) => (
		<ComboboxItem
			key={itemToValue(item)}
			value={item}
			data-testid={`${field.name}-combobox-option`}
		>
			{renderItem ? renderItem(item) : itemToLabel(item)}
		</ComboboxItem>
	);

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Combobox<TItem>
				items={groups ?? items}
				value={selectedItem}
				onValueChange={(item) => {
					if (item) field.handleChange(itemToValue(item));
				}}
				// Closing the popup is this field's blur; mark it touched so validation can fire.
				onOpenChange={(open) => {
					if (!open) field.handleBlur();
				}}
				itemToStringLabel={itemToLabel}
				itemToStringValue={itemToValue}
				isItemEqualToValue={(item, value) => itemToValue(item) === itemToValue(value)}
			>
				<ComboboxInput
					className={cn("w-full", className)}
					placeholder={placeholder}
					data-testid={`${field.name}-combobox`}
				/>
				<ComboboxContent>
					<ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
					{groups ? (
						// Padding moves to each group (shadcn's Command pattern) so every sticky label has a local gutter to cover.
						<ComboboxList className="p-0">
							{(group: ComboboxFieldGroup<TItem>) => (
								<ComboboxGroup key={group.id} items={group.items} className="p-1">
									<ComboboxLabel
										className={cn(
											// z-index: ComboboxItem is always `position: relative`, so this needs an explicit value to paint above it.
											"sticky top-0 z-10 -mx-1 -mt-1 bg-popover px-3 pt-2 pb-1.5",
											group.labelClassName,
										)}
									>
										{group.label}
									</ComboboxLabel>
									<ComboboxCollection>{renderOption}</ComboboxCollection>
								</ComboboxGroup>
							)}
						</ComboboxList>
					) : (
						<ComboboxList>{renderOption}</ComboboxList>
					)}
				</ComboboxContent>
			</Combobox>
		</FieldShell>
	);
}
