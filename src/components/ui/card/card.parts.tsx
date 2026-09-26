import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";
import { textVariants } from "#/components/ui/variants/text";

const cardVariants = tv({
	extend: textVariants,
	slots: {
		root: "flex flex-col gap-(--card-padding) overflow-hidden rounded-lg bg-surface py-(--card-padding) text-sm text-surface-fg ring-1 ring-line",
		header: "flex flex-col gap-1 px-(--card-padding)",
		content: "px-(--card-padding)",
		footer:
			"-mb-(--card-padding) flex items-center gap-2 border-t border-line bg-muted/50 p-(--card-padding)",
	},
	variants: {
		/** Sets `--card-padding`, which every part reads, so the spacing stays even. */
		size: {
			sm: { root: "[--card-padding:--spacing(3)]" },
			md: { root: "[--card-padding:--spacing(4)]" },
		},
	},
	defaultVariants: { size: "md" },
});

const cardSlots = cardVariants();

/** A panel that groups related content. Every part is a plain `<div>`; `size="sm"` tightens the spacing. */
export function Root({
	render,
	className,
	size,
	...props
}: useRender.ComponentProps<"div"> & Pick<VariantProps<typeof cardVariants>, "size">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.root({ size, class: className }) }, props),
	});
}

/** Stacks the card's title and description. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.header({ class: className }) }, props),
	});
}

/** The card's title. */
export function Title({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.title({ class: className }) }, props),
	});
}

/** The card's supporting text. */
export function Description({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.description({ class: className }) }, props),
	});
}

/** The card's main content. */
export function Content({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.content({ class: className }) }, props),
	});
}

/** Holds the card's actions at the bottom. */
export function Footer({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: cardSlots.footer({ class: className }) }, props),
	});
}
