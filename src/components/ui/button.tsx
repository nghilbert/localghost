import { Button as BaseButton } from "@base-ui/react/button";
import { type ActionVariants, actionVariants } from "#/components/ui/variants/action";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** Props for {@link Button}. */
export type ButtonProps = BaseButton.Props & ActionVariants;

/**
 * `color` picks the color, `variant` picks how loud to draw it. Any pairing
 * works, so `color="danger" variant="quiet"` is as valid as the default.
 * For navigation, use `ButtonLink` from `ui/button-link`.
 */
export function Button({ className, color, variant, size, iconOnly, ...props }: ButtonProps) {
	return (
		<BaseButton
			className={mergeClassName(className, (extra) =>
				actionVariants({ color, variant, size, iconOnly, class: extra }),
			)}
			{...props}
		/>
	);
}
