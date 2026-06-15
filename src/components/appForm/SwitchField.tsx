import { Switch } from "#/components/ui/switch";
import { useAppField } from "#/hooks/use-app-field";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function SwitchField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Switch>) {
	const { field, isFieldValid } = useAppField<boolean>();

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
