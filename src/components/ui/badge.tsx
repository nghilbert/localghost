import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv } from "tailwind-variants";
import { type ActionVariants, actionVariants } from "#/components/ui/variants/action";

/**
 * The button look without the interaction: no focus ring, no hover, no fixed
 * height. `quiet` is not offered, since it would look like ordinary text.
 */
const badgeVariants = tv({
	extend: actionVariants,
	base: "h-5 w-fit gap-1 overflow-hidden rounded-full px-2 py-0.5 text-xs [--icon-size:--spacing(3)]",
	variants: {
		variant: {
			solid: "hover:bg-(--c)",
			soft: "hover:bg-(--c-soft)",
			outlined: "hover:bg-transparent",
			quiet: "",
		},
	},
	// A badge sizes itself, so the button heights from `actionVariants` stay off.
	defaultVariants: { color: "neutral", variant: "soft", size: undefined },
});

type BadgeVariants = Omit<ActionVariants<"solid" | "soft" | "outlined">, "size" | "iconOnly">;
type BadgeState = { color: NonNullable<BadgeVariants["color"]> };

/**
 * A small label for a count, a status or a tag.
 *
 * The chosen `color` is also set as `data-color` and passed to a `render`
 * callback, so you never have to repeat it.
 */
export function Badge({
	render,
	className,
	color = "neutral",
	variant,
	...props
}: useRender.ComponentProps<"span", BadgeState> & BadgeVariants) {
	return useRender({
		defaultTagName: "span",
		render,
		state: { color },
		props: mergeProps<"span">(
			{ className: badgeVariants({ color, variant, class: className }) },
			props,
		),
	});
}
