import { Textarea } from "#/components/ui/textarea";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/** A labeled textarea bound to the enclosing form field. */
export function TextareaField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Textarea>) {
	const { field } = useFieldBinding<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Textarea
				value={field.state.value}
				onBlur={field.handleBlur}
				onValueChange={field.handleChange}
				{...props}
			/>
		</FieldShell>
	);
}
