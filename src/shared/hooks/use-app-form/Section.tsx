import type { ComponentProps, ReactNode } from "react";
import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from "#/shared/components/ui/field";

type SectionProps = ComponentProps<typeof FieldSet> & {
	legend: ReactNode;
	description?: ReactNode;
	children: ReactNode;
};

export function Section({ legend, description, children, ...props }: SectionProps) {
	return (
		<FieldSet {...props}>
			<FieldLegend>{legend}</FieldLegend>
			{description && <FieldDescription>{description}</FieldDescription>}
			<FieldGroup>{children}</FieldGroup>
		</FieldSet>
	);
}
