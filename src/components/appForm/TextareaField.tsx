import { Textarea } from "#/components/ui/textarea";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps } from "./types";

export function TextareaField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Textarea>) {
	const { field, isFieldValid, FieldShell } = useFieldShell<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Textarea
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={!isFieldValid}
				{...props}
			/>
		</FieldShell>
	);
}
