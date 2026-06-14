import type { ComponentProps, ReactNode } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { useFieldContext } from "./context";
import type { BaseFieldProps } from "./types";

type FieldShellChildArgs<T> = {
	field: ReturnType<typeof useFieldContext<T>>;
	isInvalid: boolean;
};
type FieldShellProps<T> = BaseFieldProps & {
	orientation?: ComponentProps<typeof Field>["orientation"];
	children: (args: FieldShellChildArgs<T>) => ReactNode;
};

/**
 * Owns the `<Field>` scaffold shared by every field component: the label + optional
 * description header, the `data-invalid` state, and the `FieldError` footer. It
 * reads the field context itself and hands `{ field, isInvalid }` to a render-prop
 * child, so individual fields only declare their control binding.
 */
export function FieldShell<T>({
	label,
	description,
	orientation = "responsive",
	children,
}: FieldShellProps<T>) {
	const field = useFieldContext<T>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field orientation={orientation} data-invalid={isInvalid}>
			<FieldContent>
				<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
				{description && <FieldDescription>{description}</FieldDescription>}
			</FieldContent>
			{children({ field, isInvalid })}
			<FieldError errors={field.state.meta.errorMap.onDynamic} />
		</Field>
	);
}
