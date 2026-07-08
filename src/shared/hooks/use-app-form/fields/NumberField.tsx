import { Input } from "#/shared/ui/input";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/**
 * Numeric input bound to an optional `number`. A blank field maps to `undefined`
 * rather than `0`, so an empty value means "unset", letting the consumer fall
 * back to a provider default instead of forcing a zero.
 */
export function NumberField({
	label,
	description,
	fieldOrientation,
	...props
}: ComponentFieldProps<typeof Input>) {
	const field = useFieldContext<number | undefined>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<Input
				id={field.name}
				data-testid={`${field.name}-input`}
				type="number"
				inputMode="numeric"
				value={field.state.value ?? ""}
				onBlur={field.handleBlur}
				onChange={(event) => {
					const next = event.target.valueAsNumber;
					field.handleChange(Number.isNaN(next) ? undefined : next);
				}}
				aria-invalid={!field.state.meta.isValid}
				{...props}
			/>
		</FieldShell>
	);
}
