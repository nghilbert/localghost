import type { ComponentProps, ReactNode } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/shared/components/ui/field";
import { useFieldContext } from "..";

type FieldShellProps = {
	label: string;
	description?: string;
	orientation: ComponentProps<typeof Field>["orientation"];
	children: ReactNode;
};

/**
 * Wraps a field control with its label, optional description, and validation
 * error, reading the active field from form context. Module scope keeps its
 * component identity stable; a per-render identity would remount and drop focus.
 */
export function FieldShell({
	label,
	description,
	orientation = "responsive",
	children,
}: FieldShellProps) {
	const field = useFieldContext();

	return (
		<Field
			orientation={orientation}
			invalid={!field.state.meta.isValid}
			data-testid={`field-${field.name}`}
		>
			<FieldContent>
				<FieldLabel>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			{children}
			<FieldError
				data-testid={`${field.name}-error`}
				errors={field.state.meta.errorMap.onDynamic}
			/>
		</Field>
	);
}
