import { Input } from "#/components/ui/input";
import { useAppField } from "#/hooks/use-app-field";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function InputField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Input>) {
	const { field, isFieldValid } = useAppField<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Input
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
