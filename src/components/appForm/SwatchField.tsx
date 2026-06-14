import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps, FieldOption } from "./types";

type SwatchFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "type"> & {
	options: (FieldOption & { swatchClassName: string })[];
};

export function SwatchField({
	label,
	description,
	orientation,
	options,
	...props
}: SwatchFieldProps) {
	const { field, FieldShell } = useFieldShell<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<ToggleGroup
				id={field.name}
				type="single"
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
				onBlur={field.handleBlur}
				{...props}
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
						<span className={cn("size-3 rounded-full border", option.swatchClassName)} />
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</FieldShell>
	);
}
