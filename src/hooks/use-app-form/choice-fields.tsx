import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "#/components/ui/toggle-group";
import { cn } from "#/lib/utils";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps, FieldOption } from "./types";

type SelectFieldProps = ComponentFieldProps<typeof Select> & {
	options: FieldOption[];
	placeholder?: string;
};
export function SelectField({
	label,
	description,
	options,
	placeholder,
	...props
}: SelectFieldProps) {
	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
				<Select
					value={field.state.value}
					onValueChange={(value) => field.handleChange(value)}
					{...props}
				>
					<SelectTrigger id={field.name} aria-invalid={isInvalid} onBlur={field.handleBlur}>
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
			)}
		</FieldShell>
	);
}

type ToggleGroupFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "type"> & {
	options: FieldOption[];
};
export function ToggleGroupField({ label, description, options, ...props }: ToggleGroupFieldProps) {
	return (
		<FieldShell<string> label={label} description={description}>
			{({ field, isInvalid }) => (
				<ToggleGroup
					type="single"
					variant="outline"
					size="sm"
					value={field.state.value}
					onValueChange={(value) => {
						if (value) field.handleChange(value);
					}}
					onBlur={field.handleBlur}
					{...props}
				>
					{options.map((option) => (
						<ToggleGroupItem key={option.value} value={option.value} aria-invalid={isInvalid}>
							{option.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
		</FieldShell>
	);
}

export function MultiToggleField({ label, description, options, ...props }: ToggleGroupFieldProps) {
	return (
		<FieldShell<string[]> label={label} description={description}>
			{({ field, isInvalid }) => (
				<ToggleGroup
					id={field.name}
					type="multiple"
					variant="outline"
					size="sm"
					value={field.state.value}
					onValueChange={(value) => field.handleChange(value)}
					onBlur={field.handleBlur}
					{...props}
				>
					{options.map((option) => (
						<ToggleGroupItem key={option.value} value={option.value} aria-invalid={isInvalid}>
							{option.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
		</FieldShell>
	);
}

type SwatchFieldProps = Omit<ComponentFieldProps<typeof ToggleGroup>, "type"> & {
	options: (FieldOption & { swatchClassName: string })[];
};
export function SwatchField({ label, description, options, ...props }: SwatchFieldProps) {
	return (
		<FieldShell<string> label={label} description={description}>
			{({ field }) => (
				<ToggleGroup
					id={field.name}
					type="single"
					variant="outline"
					size="sm"
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
			)}
		</FieldShell>
	);
}
