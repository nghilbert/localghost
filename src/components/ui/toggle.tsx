import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { tv } from "tailwind-variants";
import { type ActionVariants, actionVariants } from "#/components/ui/variants/action";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** The button look plus a pressed state. */
const toggleVariants = tv({
	extend: actionVariants,
	base: "data-pressed:bg-(--c-soft) data-pressed:text-(--c)",
	defaultVariants: { color: "neutral", variant: "quiet" },
});

/** `solid` and `soft` are not offered: both look pressed already. */
export type ToggleProps = BaseToggle.Props & ActionVariants<"outlined" | "quiet">;

/** A button that stays pressed until clicked again. */
export function Toggle({ className, color, variant, size, iconOnly, ...props }: ToggleProps) {
	return (
		<BaseToggle
			className={mergeClassName(className, (extra) =>
				toggleVariants({ color, variant, size, iconOnly, class: extra }),
			)}
			{...props}
		/>
	);
}
