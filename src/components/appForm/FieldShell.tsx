import type { ReactNode } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";
import type { BaseFieldProps } from "./types";

type FieldShellProps = BaseFieldProps & {
	children: ReactNode;
};

/**
 * Presentational scaffold shared by every field: the label + optional description
 * header, the `data-invalid` state, and the `FieldError` footer. It reads the field
 * from context itself, so callers pass only their label/description and control —
 * no field object, no generic, no render-prop. Orientation defaults to responsive
 * and is overridable at the call site via each field's `orientation` prop.
 */
export function FieldShell({
	label,
	description,
	orientation = "responsive",
	children,
}: FieldShellProps) {
	const field = useFieldContext();

	return (
		<Field orientation={orientation} data-invalid={isFieldInvalid(field)}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			{children}
			<FieldError errors={field.state.meta.errorMap.onDynamic} />
		</Field>
	);
}
