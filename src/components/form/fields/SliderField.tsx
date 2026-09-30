import { Slider } from "#/components/ui/slider";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/** A labeled slider bound to the enclosing form field. */
export function SliderField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Slider>) {
	const { field } = useFieldBinding<number>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Slider
				value={[field.state.value]}
				onValueChange={(value) => {
					const newValue = Array.isArray(value) ? value[0] : value;
					if (typeof newValue === "number") field.handleChange(newValue);
				}}
				// Commit on thumb release marks the field touched, so blur-mode validation fires.
				onValueCommitted={field.handleBlur}
				{...props}
			/>
		</FieldShell>
	);
}
