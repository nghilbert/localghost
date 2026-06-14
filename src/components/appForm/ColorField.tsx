import { useRef } from "react";
import { Button } from "#/components/ui/button";
import { isFieldInvalid, useFieldContext } from "#/hooks/app-form-context";
import { cn } from "#/lib/utils";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

export function ColorField({
	label,
	description,
	orientation,
	...props
}: Omit<ComponentFieldProps<"input">, "type">) {
	const field = useFieldContext<string>();
	const colorInputRef = useRef<HTMLInputElement>(null);

	return (
		<FieldShell label={label} description={description} orientation={orientation}>
			<Button
				type="button"
				variant="outline"
				className="h-8 w-8 rounded-full border-2 p-0"
				style={{ backgroundColor: field.state.value }}
				onClick={() => colorInputRef.current?.click()}
				aria-invalid={isFieldInvalid(field)}
				aria-label={`Pick ${label.toLowerCase()}`}
			/>
			<input
				ref={colorInputRef}
				id={field.name}
				type="color"
				value={field.state.value}
				onChange={(event) => field.handleChange(event.target.value)}
				{...props}
				className={cn("sr-only", props.className)}
			/>
		</FieldShell>
	);
}
