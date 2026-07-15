import type { ComponentProps } from "react";
import { Button } from "#/shared/components/ui/button";
import { Spinner } from "#/shared/components/ui/spinner";
import { useFormContext } from ".";

export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
	const { Subscribe } = useFormContext();

	return (
		<Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type="submit" disabled={isSubmitting} {...props}>
					{isSubmitting && <Spinner data-icon="inline-start" />}
					{children}
				</Button>
			)}
		</Subscribe>
	);
}
