import { Switch } from "#/components/ui/switch";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/** A labeled switch bound to the enclosing form field. */
export function SwitchField({
	label,
	description,
	fieldOrientation = "horizontal",
	...props
}: ComponentFieldProps<typeof Switch>) {
	const { field } = useFieldBinding<boolean>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Switch
				checked={field.state.value}
				onCheckedChange={field.handleChange}
				onBlur={field.handleBlur}
				{...props}
			/>
		</FieldShell>
	);
}
