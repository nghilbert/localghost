import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { useFieldShell } from "../../hooks/use-field-shell";
import type { ComponentFieldProps, FieldOption } from "./types";

type SelectFieldProps = ComponentFieldProps<typeof Select> & {
	options: FieldOption[];
	placeholder?: string;
};

export function SelectField({
	label,
	description,
	orientation,
	options,
	placeholder,
	...props
}: SelectFieldProps) {
	const { field, isFieldValid, FieldShell } = useFieldShell<string>();

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Select
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				{...props}
			>
				<SelectTrigger id={field.name} aria-invalid={!isFieldValid} onBlur={field.handleBlur}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</FieldShell>
	);
}
