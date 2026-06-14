import type { ComponentProps, PropsWithChildren } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { useFieldContext } from "#/hooks/app-form-context";

type FieldShellProps = PropsWithChildren<{
	label: string;
	description?: string;
	orientation: ComponentProps<typeof Field>["orientation"];
}>;

export function useFieldShell<TValue>() {
	const field = useFieldContext<TValue>();
	// Fields that haven't been touched yet are valid. Otherwise use the field's isValid state
	const isFieldValid = !field.state.meta.isTouched ? true : field.state.meta.isValid;

	return {
		field,
		isFieldValid,
		FieldShell: ({ label, description, orientation = "responsive", children }: FieldShellProps) => (
			<Field orientation={orientation} data-invalid={!isFieldValid}>
				<FieldContent>
					<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
					{description && <FieldDescription>{description}</FieldDescription>}
				</FieldContent>
				{children}
				<FieldError errors={field.state.meta.errorMap.onDynamic} />
			</Field>
		),
	};
}
