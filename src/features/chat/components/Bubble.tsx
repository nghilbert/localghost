import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

/*
 * `color` sets `--c`, `--c-fg` and `--c-soft`; `variant` turns them into the
 * `--bubble-*` values `BubbleContent` draws with. The two parts are siblings in
 * the tree, so the variables are how `Bubble`'s props reach its content.
 */
const bubbleVariants = tv({
	slots: {
		root: [
			"flex w-fit max-w-[80%] min-w-0 flex-col gap-1 in-align-end:self-end",
			"[--bubble-pad-x:--spacing(3)] [--bubble-pad-y:--spacing(2)] [--bubble-ring:transparent]",
		],
		content: [
			"w-fit max-w-full min-w-0 overflow-hidden rounded-xl text-sm leading-relaxed wrap-break-word in-align-end:self-end",
			"bg-(--bubble-bg) px-(--bubble-pad-x) py-(--bubble-pad-y) text-(--bubble-fg) ring-1 ring-(--bubble-ring)",
		],
	},
	variants: {
		color: {
			primary: {
				root: "[--c:var(--color-primary)] [--c-fg:var(--color-primary-fg)] [--c-soft:var(--color-primary-soft)]",
			},
			neutral: {
				root: "[--c:var(--color-neutral)] [--c-fg:var(--color-neutral-fg)] [--c-soft:var(--color-neutral-soft)]",
			},
			danger: {
				root: "[--c:var(--color-danger)] [--c-fg:var(--color-danger-fg)] [--c-soft:var(--color-danger-soft)]",
			},
		},
		/** How loud to draw the bubble. `quiet` draws none, leaving the text full width. */
		variant: {
			solid: { root: "[--bubble-bg:var(--c)] [--bubble-fg:var(--c-fg)]" },
			soft: { root: "[--bubble-bg:var(--c-soft)] [--bubble-fg:var(--color-fg)]" },
			outlined: {
				root: "[--bubble-bg:var(--color-bg)] [--bubble-fg:var(--color-fg)] [--bubble-ring:var(--color-line)]",
			},
			quiet: {
				root: "max-w-full [--bubble-bg:transparent] [--bubble-fg:currentColor] [--bubble-pad-x:0] [--bubble-pad-y:0]",
			},
		},
	},
	defaultVariants: { color: "primary", variant: "solid" },
});

const bubbleSlots = bubbleVariants();

/** A speech bubble inside a `MessageContent`. It follows the message to its side. */
export function Bubble({
	render,
	className,
	color,
	variant,
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ className: bubbleSlots.root({ color, variant, class: className }) },
			props,
		),
	});
}

/** The padded text area inside a `Bubble`. */
export function BubbleContent({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: bubbleSlots.content({ class: className }) }, props),
	});
}
