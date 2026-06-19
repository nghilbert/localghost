import type { ComponentProps, PropsWithChildren } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { useFieldContext } from "../context";

type FieldShellProps = PropsWithChildren<{
	label: string;
	description?: string;
	orientation: ComponentProps<typeof Field>["orientation"];
}>;

/**
 * Wraps a field control with its label, optional description, and validation error, reading the
 * active field from form context. Declared at module scope so its component identity is stable
 * across renders; an identity that changes per render would remount the control and drop focus.
 *
 * @param label - The field's label text.
 * @param description - Optional hint rendered beneath the label.
 * @param orientation - Layout orientation forwarded to the underlying `Field`.
 * @param children - The control to wrap (input, select, switch, …).
 */
export function FieldShell({
	label,
	description,
	orientation = "responsive",
	children,
}: FieldShellProps) {
	const field = useFieldContext();

	return (
		<Field orientation={orientation} data-invalid={!field.state.meta.isValid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			{children}
			<FieldError errors={field.state.meta.errorMap.onDynamic} />
		</Field>
	);
}
