import { Textarea } from "#/shared/components/ui/textarea";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function TextareaField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Textarea>) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Textarea
				id={field.name}
				data-testid={`${field.name}-input`}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={!field.state.meta.isValid}
				{...props}
			/>
		</FieldShell>
	);
}
