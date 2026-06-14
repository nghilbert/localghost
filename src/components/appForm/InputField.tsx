import { Input } from "#/components/ui/input";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function InputField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Input>) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Input
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
