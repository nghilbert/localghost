import type { ComponentProps, ReactNode } from "react";
import { FieldGroup } from "#/shared/components/ui/field";
import { cn } from "#/shared/lib/utils";
import { useFormContext } from ".";

type SubmitFormProps = ComponentProps<typeof FieldGroup> & {
	children: ReactNode;
	formClassName?: string;
};
export function SubmitForm({ children, formClassName, ...props }: SubmitFormProps) {
	const { handleSubmit } = useFormContext();

	return (
		<form
			className={cn("w-full", formClassName)}
			onSubmit={(event) => {
				event.preventDefault();
				handleSubmit().catch(() => undefined);
			}}
		>
			<FieldGroup {...props}>{children}</FieldGroup>
		</form>
	);
}
