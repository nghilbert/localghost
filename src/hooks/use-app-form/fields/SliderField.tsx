import { Slider } from "#/components/ui/slider";
import { cn } from "#/lib/utils";
import { useFieldContext } from "../context";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function SliderField({
	label,
	description,
	fieldOrientation,
	className,
	...props
}: ComponentFieldProps<typeof Slider>) {
	const field = useFieldContext<number>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Slider
				value={[field.state.value]}
				onValueChange={([value]) => field.handleChange(value ?? field.state.value)}
				onBlur={field.handleBlur}
				aria-invalid={!field.state.meta.isValid}
				className={cn("min-w-xs", className)}
				{...props}
			/>
		</FieldShell>
	);
}
