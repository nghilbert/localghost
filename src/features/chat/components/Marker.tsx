import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

const markerVariants = tv({
	slots: {
		root: [
			"relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-fg",
			"[--icon-size:--spacing(4)] [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-fg",
		],
		icon: "flex size-4 shrink-0 items-center justify-center",
		content: "min-w-0 wrap-break-word",
	},
	variants: {
		/** `separator` rules a line out to either side; `border` underlines the row. */
		layout: {
			plain: {},
			separator: {
				root: [
					"*:shrink-0",
					"before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-line",
					"after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-line",
				],
			},
			border: { root: "border-b border-line pb-2" },
		},
	},
	defaultVariants: { layout: "plain" },
});

const markerSlots = markerVariants();

/** A one-line note in a transcript: what the assistant did, or is doing. */
export function Marker({
	render,
	className,
	layout,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof markerVariants>) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: markerSlots.root({ layout, class: className }) }, props),
	});
}

/** The icon at the start of a `Marker`, hidden from assistive tech. */
export function MarkerIcon({ render, className, ...props }: useRender.ComponentProps<"span">) {
	return useRender({
		defaultTagName: "span",
		render,
		props: mergeProps<"span">(
			{ "aria-hidden": true, className: markerSlots.icon({ class: className }) },
			props,
		),
	});
}

/** The text of a `Marker`. */
export function MarkerContent({ render, className, ...props }: useRender.ComponentProps<"span">) {
	return useRender({
		defaultTagName: "span",
		render,
		props: mergeProps<"span">({ className: markerSlots.content({ class: className }) }, props),
	});
}
