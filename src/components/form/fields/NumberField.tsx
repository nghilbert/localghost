import { NumberField as NumberFieldUi } from "#/components/ui/number-field";
import { useFieldBinding } from "../use-field-binding";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/**
 * Bound to an optional `number`. A blank field is `undefined`, not `0`, so "unset"
 * falls back to a provider default. Base UI models blank as `null`, bridged to
 * `undefined` at the value boundary.
 */
export function NumberField({
	label,
	description,
	fieldOrientation,
	className,
	placeholder,
	...props
}: ComponentFieldProps<typeof NumberFieldUi.Root> & { className?: string; placeholder?: string }) {
	const { field } = useFieldBinding<number | undefined>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<NumberFieldUi.Root
				value={field.state.value ?? null}
				onValueChange={(value) => field.handleChange(value ?? undefined)}
				onBlur={field.handleBlur}
				{...props}
			>
				<NumberFieldUi.Group className={className}>
					<NumberFieldUi.Decrement />
					<NumberFieldUi.Input placeholder={placeholder} />
					<NumberFieldUi.Increment />
				</NumberFieldUi.Group>
			</NumberFieldUi.Root>
		</FieldShell>
	);
}
