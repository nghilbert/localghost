import type { ComponentProps, ReactNode } from "react";
import { FieldGroup } from "#/shared/components/ui/field";
import { useFormContext } from ".";

type SubmitFormProps = ComponentProps<typeof FieldGroup> & { children: ReactNode };
export function SubmitForm({ children, ...props }: SubmitFormProps) {
	const { handleSubmit } = useFormContext();

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				handleSubmit().catch(() => undefined);
			}}
		>
			<FieldGroup {...props}>{children}</FieldGroup>
		</form>
	);
}
