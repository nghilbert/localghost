import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn, tv, type VariantProps } from "tailwind-variants";

const pageVariants = tv({
	base: "mx-auto flex w-full flex-col",
	variants: {
		size: {
			sm: "max-w-sm",
			md: "max-w-2xl",
			lg: "max-w-4xl",
			xl: "max-w-6xl",
		},
		/** `none` leaves padding and gaps to the caller, for a page that lays itself out. */
		spacing: {
			page: "gap-6 px-4 py-8",
			none: "",
		},
	},
	defaultVariants: { size: "lg", spacing: "page" },
});

/** The width and padding of a route's content. Every page renders inside one. */
export function Page({
	render,
	className,
	size,
	spacing,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof pageVariants>) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cn(pageVariants({ size, spacing }), className) }, props),
	});
}
