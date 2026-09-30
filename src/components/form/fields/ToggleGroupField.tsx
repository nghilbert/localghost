import { Toggle, type ToggleProps } from "#/components/ui/toggle";
import { ToggleGroup } from "#/components/ui/toggle-group";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps, FieldOption } from "./types";

/** Props for {@link ToggleGroupField}. */
type ToggleGroupFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "multiple"> & {
	options: FieldOption[];
	/** How loud to draw each option. */
	variant?: ToggleProps["variant"];
};

/** A labeled toggle group bound to the enclosing form field. */
export function ToggleGroupField({
	label,
	description,
	fieldOrientation,
	options,
	variant,
	...props
}: ToggleGroupFieldProps) {
	const { field } = useFieldBinding<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			{/* Base UI's ToggleGroup doesn't read Field context, so FieldLabel can't bind
			    to it; name the group directly instead of leaving it unlabelled. */}
			<ToggleGroup
				aria-label={label}
				value={[field.state.value]}
				onValueChange={(value) => {
					const newValue = value[0];
					if (typeof newValue === "string") field.handleChange(newValue);
				}}
				onBlur={field.handleBlur}
				{...props}
			>
				{options.map((option) => (
					<Toggle key={option.value} value={option.value} variant={variant}>
						{option.icon && <option.icon />}
						{option.label}
					</Toggle>
				))}
			</ToggleGroup>
		</FieldShell>
	);
}
