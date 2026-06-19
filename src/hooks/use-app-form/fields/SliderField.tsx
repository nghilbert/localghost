import { Slider } from "#/components/ui/slider";
import { useFieldContext } from "../app-form-context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function SliderField({
	label,
	description,
	orientation,
	...props
}: ComponentFieldProps<typeof Slider>) {
	const field = useFieldContext<number>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Slider
				id={field.name}
				value={[field.state.value]}
				onValueChange={([value]) => field.handleChange(value ?? field.state.value)}
				onBlur={field.handleBlur}
				{...props}
			/>
		</FieldShell>
	);
}
