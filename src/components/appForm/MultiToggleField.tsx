import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ToggleGroupFieldProps } from "./ToggleGroupField";

export function MultiToggleField({
	label,
	description,
	orientation,
	options,
	...props
}: ToggleGroupFieldProps) {
	const { field, isFieldValid, FieldShell } = useFieldShell<string[]>();

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
					<ToggleGroupItem key={option.value} value={option.value} aria-invalid={!isFieldValid}>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</FieldShell>
	);
}
