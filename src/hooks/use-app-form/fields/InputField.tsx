import { Input } from "#/components/ui/input";
import { useFieldContext } from "../context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function InputField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Input>) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Input
				id={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(event) => field.handleChange(event.target.value)}
				aria-invalid={!field.state.meta.isValid}
				{...props}
			/>
		</FieldShell>
	);
}
