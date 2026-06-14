import { Switch } from "#/components/ui/switch";
import { isFieldInvalid } from "#/hooks/app-form-context";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps } from "./types";

export function SwitchField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Switch>) {
	const { field, FieldShell } = useFieldShell<boolean>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Switch
				id={field.name}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				onBlur={field.handleBlur}
				aria-invalid={isFieldInvalid(field)}
				{...props}
			/>
		</FieldShell>
	);
}
