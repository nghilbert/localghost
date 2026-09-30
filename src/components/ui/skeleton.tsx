import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

const skeletonVariants = tv({
	base: "bg-muted",
	variants: {
		animation: {
			pulse: "animate-pulse",
			shimmer:
				"relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-fg/5 before:to-transparent",
			none: "",
		},
		shape: {
			default: "rounded-md",
			circle: "rounded-full",
		},
	},
	defaultVariants: {
		animation: "shimmer",
		shape: "default",
	},
});

/** Props for {@link Skeleton}. */
export type SkeletonProps = useRender.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>;

/**
 * A grey placeholder shape, hidden from screen readers. Put `aria-busy` on the
 * area that is loading. Use `render={<span />}` inside a line of text.
 */
export function Skeleton({ render, className, animation, shape, ...props }: SkeletonProps) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ className: skeletonVariants({ animation, shape, class: className }), "aria-hidden": true },
			props,
		),
	});
}
