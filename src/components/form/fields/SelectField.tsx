import { Select } from "#/components/ui/select";
import { closeAsBlur, useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps, FieldOption } from "./types";

/** Props for {@link SelectField}. */
type SelectFieldProps = BaseFieldProps & {
	options: FieldOption[];
	placeholder?: string;
};

/** A labeled select bound to the enclosing form field. */
export function SelectField({
	label,
	description,
	fieldOrientation,
	options,
	placeholder,
}: SelectFieldProps) {
	const { field } = useFieldBinding<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Select.Root
				items={options}
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
				onOpenChange={closeAsBlur(field)}
			>
				<Select.Trigger className="w-full">
					<Select.Value placeholder={placeholder} />
				</Select.Trigger>
				<Select.Content>
					{options.map((option) => (
						<Select.Item key={option.value} value={option.value}>
							{option.icon && <option.icon />}
							{option.label}
						</Select.Item>
					))}
				</Select.Content>
			</Select.Root>
		</FieldShell>
	);
}
