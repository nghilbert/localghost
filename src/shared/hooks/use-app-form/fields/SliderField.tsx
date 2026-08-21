import { Slider } from "#/shared/components/ui/slider";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function SliderField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Slider>) {
	const field = useFieldContext<number>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Slider
				data-testid={`${field.name}-slider`}
				value={[field.state.value]}
				onValueChange={(value) => {
					if (typeof value === "number") field.handleChange(value);
					else field.handleChange(value[0] ?? field.state.value);
				}}
				// Commit on thumb release marks the field touched, so blur-mode validation fires.
				onValueCommitted={field.handleBlur}
				{...props}
			/>
		</FieldShell>
	);
}
