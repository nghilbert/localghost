import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps, FieldOption } from "./types";

export type ToggleGroupFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "type"> & {
	options: FieldOption[];
};

export function ToggleGroupField({
	label,
	description,
	orientation,
	options,
	...props
}: ToggleGroupFieldProps) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<ToggleGroup
				type="single"
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
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
