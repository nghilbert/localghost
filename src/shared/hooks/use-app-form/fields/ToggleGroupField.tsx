import { ToggleGroup, ToggleGroupItem } from "#/shared/components/ui/toggle-group";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps, FieldOption } from "./types";

export type ToggleGroupFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "type"> & {
	options: FieldOption[];
};

export function ToggleGroupField({
	label,
	description,
	fieldOrientation,
	options,
	...props
}: ToggleGroupFieldProps) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<ToggleGroup
				id={field.name}
				value={[field.state.value]}
				onValueChange={(value) => {
					const newValue = value[0];
					if (newValue) field.handleChange(newValue);
				}}
				onBlur={field.handleBlur}
				aria-invalid={!field.state.meta.isValid}
				{...props}
			>
				{options.map((option) => (
					<ToggleGroupItem
						key={option.value}
						value={option.value}
						data-testid={`${field.name}-option-${option.value}`}
					>
						{option.icon && <option.icon />}
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</FieldShell>
	);
}
