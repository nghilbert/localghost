import type { ReactNode } from "react";
import { FieldShell } from "./FieldShell";
import type { BaseFieldProps } from "./types";

/** The field shell (label, description, error) around a control with no dedicated `*Field`. */
export function CustomField({
	label,
	description,
	fieldOrientation,
	children,
}: BaseFieldProps & { children: ReactNode }) {
	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			{children}
		</FieldShell>
	);
}
