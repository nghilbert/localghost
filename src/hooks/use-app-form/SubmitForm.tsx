import type { ComponentProps, PropsWithChildren } from "react";
import { FieldGroup } from "#/components/ui/field";
import { useFormContext } from "./context";

export function SubmitForm({
	children,
	...props
}: PropsWithChildren<ComponentProps<typeof FieldGroup>>) {
	const { handleSubmit } = useFormContext();

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				handleSubmit();
			}}
		>
			<FieldGroup {...props}>{children}</FieldGroup>
		</form>
	);
}
