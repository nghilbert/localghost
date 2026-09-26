import { Field } from "#/components/ui/field";
import { Radio } from "#/components/ui/radio";
import { RadioGroup } from "#/components/ui/radio-group";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps, FieldOption } from "./types";

/** Props for {@link RadioGroupField}. */
type RadioGroupFieldProps = Omit<ComponentFieldProps<typeof RadioGroup>, "name"> & {
	options: FieldOption[];
};

/** A labeled radio group bound to the enclosing form field. */
export function RadioGroupField({
	label,
	description,
	fieldOrientation,
	options,
	...props
}: RadioGroupFieldProps) {
	const { field } = useFieldBinding<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<RadioGroup
				name={field.name}
				value={field.state.value}
				onValueChange={field.handleChange}
				onBlur={field.handleBlur}
				{...props}
			>
				{options.map((option) => (
					<Field.Item key={option.value}>
						<Field.Label>
							<Radio value={option.value} />
							{option.label}
						</Field.Label>
					</Field.Item>
				))}
			</RadioGroup>
		</FieldShell>
	);
}
