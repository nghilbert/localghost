import type { ReactNode } from "react";
import { cn } from "tailwind-variants";
import { Combobox } from "#/components/ui/combobox";
import { closeAsBlur, useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps } from "./types";

/** A labelled bucket of items for the grouped form of {@link ComboboxField}. */
export type ComboboxFieldGroup<TItem> = {
	id: string;
	label: string;
	/** Classes for the sticky group label, such as a color that echoes the bucket's meaning. */
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
	/** Classes for the box drawn around the input. */
	className?: string;
};

/** Exactly one of `items` (flat) or `groups` (labelled buckets) is provided. */
type ComboboxFieldProps<TItem> = ComboboxFieldBase<TItem> &
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
	const { field } = useFieldBinding<string>();
	const flatItems = groups ? groups.flatMap((group) => group.items) : (items ?? []);
	const selectedItem = flatItems.find((item) => itemToValue(item) === field.state.value) ?? null;

	const renderOption = (item: TItem) => (
		<Combobox.Item key={itemToValue(item)} value={item}>
			{renderItem ? renderItem(item) : itemToLabel(item)}
		</Combobox.Item>
	);

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Combobox.Root<TItem>
				items={groups ?? items}
				value={selectedItem}
				onValueChange={(item) => {
					if (item) field.handleChange(itemToValue(item));
				}}
				onOpenChange={closeAsBlur(field)}
				itemToStringLabel={itemToLabel}
				itemToStringValue={itemToValue}
				isItemEqualToValue={(item, value) => itemToValue(item) === itemToValue(value)}
			>
				<Combobox.Input groupClassName={cn("w-full", className)} placeholder={placeholder} />
				<Combobox.Content>
					<Combobox.Empty>{emptyMessage}</Combobox.Empty>
					{groups ? (
						// Each group pads itself, so every sticky label has its own gutter to cover.
						<Combobox.List className="p-0">
							{(group: ComboboxFieldGroup<TItem>) => (
								<Combobox.Group key={group.id} items={group.items} className="p-1">
									<Combobox.GroupLabel
										className={cn("-mx-1 -mt-1 px-3 pt-2", group.labelClassName)}
									>
										{group.label}
									</Combobox.GroupLabel>
									<Combobox.Collection>{renderOption}</Combobox.Collection>
								</Combobox.Group>
							)}
						</Combobox.List>
					) : (
						<Combobox.List>{renderOption}</Combobox.List>
					)}
				</Combobox.Content>
			</Combobox.Root>
		</FieldShell>
	);
}
