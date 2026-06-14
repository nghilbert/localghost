import { Textarea } from "#/components/ui/textarea";
import { isFieldInvalid } from "#/hooks/app-form-context";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps } from "./types";

export function TextareaField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Textarea>) {
	const { field, FieldShell } = useFieldShell<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Textarea
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={isFieldInvalid(field)}
				{...props}
			/>
		</FieldShell>
	);
}
