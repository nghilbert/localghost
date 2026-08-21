import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/shared/components/ui/select";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps, FieldOption } from "./types";

export type SelectFieldProps = BaseFieldProps & {
	options: FieldOption[];
	placeholder?: string;
};

export function SelectField({
	label,
	description,
	fieldOrientation,
	options,
	placeholder,
}: SelectFieldProps) {
	const field = useFieldContext<string>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Select
				items={options}
				value={field.state.value}
				onValueChange={(value) => {
					if (value) field.handleChange(value);
				}}
				// Closing the popup is this field's blur; mark it touched so validation can fire.
				onOpenChange={(open) => {
					if (!open) field.handleBlur();
				}}
			>
				<SelectTrigger data-testid={`${field.name}-select`} className="w-full">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem
							key={option.value}
							value={option.value}
							data-testid={`${field.name}-option-${option.value}`}
						>
							{option.icon && <option.icon />}
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}
