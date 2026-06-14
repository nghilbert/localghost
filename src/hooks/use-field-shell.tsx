import type { ComponentProps, PropsWithChildren } from "react";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/ui/field";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";

type FieldShellProps = PropsWithChildren<{
	label: string;
	description?: string;
	orientation: ComponentProps<typeof Field>["orientation"];
}>;

export function useFieldShell<TValue>() {
	const field = useFieldContext<TValue>();

	return {
		field,
		FieldShell: ({ label, description, orientation = "responsive", children }: FieldShellProps) => (
			<Field orientation={orientation} data-invalid={isFieldInvalid(field)}>
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
