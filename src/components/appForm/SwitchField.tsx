import { Switch } from "#/components/ui/switch";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps } from "./types";

export function SwitchField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Switch>) {
	const { field, isFieldValid, FieldShell } = useFieldShell<boolean>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				onBlur={field.handleBlur}
				aria-invalid={!isFieldValid}
				{...props}
			/>
		</FieldShell>
	);
}
