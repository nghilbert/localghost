import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

/*
 * Joins the buttons inside it into one bar: inner corners squared, the shared
 * border drawn once. `-of-type` so a hidden `<input>` a Select renders beside
 * its trigger does not count as the last button.
 */
const buttonGroupVariants = tv({
	base: "flex w-fit items-stretch *:focus-visible:z-10",
	variants: {
		orientation: {
			horizontal:
				"*:not-first-of-type:rounded-s-none *:not-first-of-type:border-s-0 *:not-last-of-type:rounded-e-none",
			vertical:
				"flex-col *:not-first-of-type:rounded-t-none *:not-first-of-type:border-t-0 *:not-last-of-type:rounded-b-none",
		},
	},
	defaultVariants: { orientation: "horizontal" },
});

/** A row (or column) of related buttons and triggers drawn as one control. Label it with `aria-label`. */
export function ButtonGroup({
	render,
	className,
	orientation,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof buttonGroupVariants>) {
	return useRender({
		defaultTagName: "div",
		render,
		state: { orientation: orientation ?? "horizontal" },
		props: mergeProps<"div">(
			{
				role: "group",
				className: buttonGroupVariants({ orientation, class: className }),
			},
			props,
		),
	});
}
