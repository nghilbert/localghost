import { MinusIcon, PlusIcon } from "lucide-react";
import {
	NumberFieldDecrement,
	NumberFieldGroup,
	NumberFieldIncrement,
	NumberFieldInput,
	NumberField as NumberFieldRoot,
} from "#/shared/components/ui/number-field";
import { useFieldContext } from "..";
import { FieldShell } from "./FieldShell";
import type { ComponentFieldProps } from "./types";

/**
 * Numeric input bound to an optional `number`, on Base UI's NumberField primitive.
 * A blank field is `undefined`, not `0`, so "unset" falls back to a provider default.
 * Base UI models blank as `null`, bridged to `undefined` at the value boundary.
 */
export function NumberField({
	label,
	description,
	fieldOrientation,
	className,
	placeholder,
	...props
}: ComponentFieldProps<typeof NumberFieldRoot> & { placeholder?: string }) {
	const field = useFieldContext<number | undefined>();

	return (
		<FieldShell label={label} description={description} orientation={fieldOrientation}>
			<NumberFieldRoot
				value={field.state.value ?? null}
				onValueChange={(value) => field.handleChange(value ?? undefined)}
				onBlur={field.handleBlur}
				{...props}
			>
				<NumberFieldGroup className={className}>
					<NumberFieldDecrement data-testid={`${field.name}-decrement`}>
						<MinusIcon />
					</NumberFieldDecrement>
					<NumberFieldInput data-testid={`${field.name}-input`} placeholder={placeholder} />
					<NumberFieldIncrement data-testid={`${field.name}-increment`}>
						<PlusIcon />
					</NumberFieldIncrement>
				</NumberFieldGroup>
			</NumberFieldRoot>
		</FieldShell>
	);
}
