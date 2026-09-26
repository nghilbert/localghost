import { useId } from "react";
import { Button, type ButtonProps } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useFormContext } from "./form-context";

/**
 * Disables while the form submits, following Base UI's loading-button pattern:
 * `focusableWhenDisabled` keeps focus on the button, and `aria-labelledby` names
 * it from the changing text since some screen readers miss updates to a focused
 * button's own text.
 */
export function SubmitButton({ children, ...props }: ButtonProps) {
	const form = useFormContext();
	const labelId = useId();

	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					type="submit"
					disabled={isSubmitting}
					focusableWhenDisabled
					aria-labelledby={labelId}
					{...props}
				>
					{isSubmitting && <Spinner size="sm" />}
					<span id={labelId}>{children}</span>
				</Button>
			)}
		</form.Subscribe>
	);
}
