import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv, type VariantProps } from "tailwind-variants";

/*
 * `color` sets `--c` (the title and icon) and `--alert-description`; `variant`
 * picks the surface. An icon placed first moves the text into a second column.
 */
const alertVariants = tv({
	slots: {
		root: [
			"relative grid w-full gap-0.5 rounded-lg px-3 py-2.5 text-left text-sm",
			"has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 has-[>svg]:*:not-[svg]:col-start-2",
			"*:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-(--c) [--icon-size:--spacing(4)]",
			"has-data-action:pr-36",
		],
		title: "font-medium text-(--c) [&_a]:underline [&_a]:underline-offset-3",
		description:
			"text-sm text-balance text-(--alert-description) md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
		action: "absolute top-2 right-2",
	},
	variants: {
		color: {
			primary: {
				root: "[--alert-description:var(--color-muted-fg)] [--c:var(--color-primary)] [--c-soft:var(--color-primary-soft)]",
			},
			neutral: {
				root: "[--alert-description:var(--color-muted-fg)] [--c:var(--color-fg)] [--c-soft:var(--color-neutral-soft)]",
			},
			danger: {
				root: "[--alert-description:var(--color-danger)] [--c:var(--color-danger)] [--c-soft:var(--color-danger-soft)]",
			},
		},
		variant: {
			soft: { root: "bg-(--c-soft)" },
			outlined: { root: "bg-surface ring-1 ring-line" },
		},
	},
	defaultVariants: { color: "neutral", variant: "outlined" },
});

const alertSlots = alertVariants();

type AlertVariants = VariantProps<typeof alertVariants>;

/**
 * A message that needs the reader's attention, announced as it appears. Put a
 * lucide icon first to draw it beside the text.
 */
export function Root({
	render,
	className,
	color,
	variant,
	...props
}: useRender.ComponentProps<"div"> & AlertVariants) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ role: "alert", className: alertSlots.root({ color, variant, class: className }) },
			props,
		),
	});
}

/** The alert's title. */
export function Title({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: alertSlots.title({ class: className }) }, props),
	});
}

/** The alert's supporting text. */
export function Description({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: alertSlots.description({ class: className }) }, props),
	});
}

/** A button or two pinned to the top right corner. The text makes room for it. */
export function Action({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		state: { action: true },
		props: mergeProps<"div">({ className: alertSlots.action({ class: className }) }, props),
	});
}
