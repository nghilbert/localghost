import type { ComponentProps, ReactNode } from "react";
import { Form as FormUi } from "#/components/ui/form";
import { FieldErrors } from "#/lib/form-errors";
import { useFormContext } from "./form-context";

type FormProps = Omit<ComponentProps<typeof FormUi>, "onSubmit"> & { children: ReactNode };

/**
 * Submits the form and shows a thrown `FieldErrors` inline on the fields it names.
 * Other errors are left to the mutation's `onError`.
 */
export function Form({ children, ...props }: FormProps) {
	const form = useFormContext();

	return (
		<FormUi
			{...props}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit().catch((error) => {
					if (!(error instanceof FieldErrors)) return;
					form.setErrorMap({ onServer: { fields: error.fields } });
				});
			}}
		>
			{children}
		</FormUi>
	);
}
