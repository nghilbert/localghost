import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

import { cn } from "#/shared/lib/utils";

export const containerVariants = tv({
	base: "mx-auto w-full",
	variants: {
		size: {
			xs: "max-w-xs",
			sm: "max-w-sm",
			md: "max-w-md",
			lg: "max-w-lg",
			xl: "max-w-xl",
			"2xl": "max-w-2xl",
			"3xl": "max-w-3xl",
			"4xl": "max-w-4xl",
			"5xl": "max-w-5xl",
			"6xl": "max-w-6xl",
			"7xl": "max-w-7xl",
			full: "max-w-full",
		},
	},
});

/**
 * A centered, width-capped column. Owns only centering and the cap, so the caller
 * still supplies display, flex, and padding for the space it is placing this in.
 */
export function Container({
	className,
	size,
	render,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof containerVariants>) {
	return useRender({
		defaultTagName: "div",
		props: mergeProps<"div">({ className: cn(containerVariants({ size }), className) }, props),
		render,
		state: { slot: "container", size },
	});
}
