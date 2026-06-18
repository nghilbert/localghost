import type { ComponentProps, PropsWithChildren, ReactNode } from "react";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "#/components/ui/field";

export function Section({
	legend,
	description,
	children,
	...props
}: PropsWithChildren<
	ComponentProps<typeof FieldSet> & { legend: ReactNode; description?: ReactNode }
>) {
	return (
		<FieldSet {...props}>
			<FieldLegend>{legend}</FieldLegend>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldGroup>{children}</FieldGroup>
		</FieldSet>
	);
}
