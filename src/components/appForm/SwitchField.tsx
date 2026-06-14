import { Switch } from "#/components/ui/switch";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function SwitchField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Switch>) {
	const field = useFieldContext<boolean>();

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
