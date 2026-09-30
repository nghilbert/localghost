import type { ComponentProps, ReactNode } from "react";
import { Field } from "#/components/ui/field";
import { useFieldBinding } from "../use-field-binding";

type FieldShellProps = {
	label: string;
	description?: string;
	orientation?: ComponentProps<typeof Field.Root>["orientation"];
	children: ReactNode;
};

/**
 * Wraps a field control with its label, optional description, and validation error,
 * reading the active field from form context. Laid out `responsive` unless told
 * otherwise, so a wide form puts each label beside its control. Module scope keeps
 * its component identity stable; a per-render identity would remount and drop focus.
 */
export function FieldShell({
	label,
	description,
	orientation = "responsive",
	children,
}: FieldShellProps) {
	const { rootProps, errors } = useFieldBinding();

	return (
		<Field.Root orientation={orientation} {...rootProps}>
			<Field.Content>
				<Field.Label>{label}</Field.Label>
				{description && <Field.Description>{description}</Field.Description>}
			</Field.Content>
			{children}
			<Field.Error errors={errors} />
		</Field.Root>
	);
}
