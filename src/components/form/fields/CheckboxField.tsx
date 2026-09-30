import { Checkbox } from "#/components/ui/checkbox";
import { Field } from "#/components/ui/field";
import { useFieldBinding } from "../use-field-binding";
import type { ComponentFieldProps } from "./types";

/**
 * The checkbox sits inline inside its own label (`Checkbox + text`), so this skips
 * FieldShell's label-above layout, which assumes the label describes a separate control.
 */
export function CheckboxField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Checkbox>) {
	const { field, rootProps, errors } = useFieldBinding<boolean>();

	return (
		<Field.Root orientation={fieldOrientation} {...rootProps}>
			<Field.Label className="items-start font-normal">
				<Checkbox
					checked={field.state.value}
					onCheckedChange={field.handleChange}
					onBlur={field.handleBlur}
					{...props}
				/>
				{label}
			</Field.Label>
			{description && <Field.Description className="ml-6">{description}</Field.Description>}
			<Field.Error errors={errors} className="ml-6" />
		</Field.Root>
	);
}
