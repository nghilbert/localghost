import { Form as BaseForm } from "@base-ui/react/form";
import { mergeClassName } from "#/components/ui/variants/class-name";

/**
 * A `<form>` that stacks its fields and routes server `errors` to them by name.
 * It is a size container, so a `responsive` field inside reads the form's width.
 */
export function Form({ className, ...props }: BaseForm.Props) {
	return (
		<BaseForm
			className={mergeClassName(className, (extra) => [
				"@container flex w-full flex-col gap-5",
				extra,
			])}
			{...props}
		/>
	);
}
