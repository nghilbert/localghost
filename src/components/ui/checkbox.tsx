import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";
import { choiceVariants } from "#/components/ui/variants/choice";
import { mergeClassName } from "#/components/ui/variants/class-name";

/**
 * A box that can be checked, unchecked or indeterminate.
 *
 * It renders a `<span>`, so wrapping it in a `<label>` works. If the label is a
 * separate element pointing at it with `htmlFor`, pass
 * `nativeButton render={<button />}` instead.
 */
export function Checkbox({ className, ...props }: BaseCheckbox.Root.Props) {
	return (
		<BaseCheckbox.Root
			className={mergeClassName(className, (extra) => choiceVariants({ class: extra }))}
			{...props}
		>
			<BaseCheckbox.Indicator className="grid place-content-center [--icon-size:--spacing(3.5)]">
				<CheckIcon />
			</BaseCheckbox.Indicator>
		</BaseCheckbox.Root>
	);
}
