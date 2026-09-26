import { Input } from "#/components/ui/input";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/** A labeled text input bound to the enclosing form field. */
export function InputField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Input>) {
	const { field } = useFieldBinding<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Input
				value={field.state.value}
				onBlur={field.handleBlur}
				onValueChange={field.handleChange}
				{...props}
			/>
		</FieldShell>
	);
}
