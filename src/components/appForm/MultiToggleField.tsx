import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { isFieldInvalid } from "#/hooks/app-form-context";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ToggleGroupFieldProps } from "./ToggleGroupField";

export function MultiToggleField({
	label,
	description,
	orientation,
	options,
	...props
}: ToggleGroupFieldProps) {
	const { field, FieldShell } = useFieldShell<string[]>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<ToggleGroup
				id={field.name}
				type="multiple"
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				onBlur={field.handleBlur}
				{...props}
			>
				{options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						aria-invalid={isFieldInvalid(field)}
					>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</FieldShell>
	);
}
