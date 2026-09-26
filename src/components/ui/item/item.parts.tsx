import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Separator as SeparatorUi } from "#/components/ui/separator";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { FOCUS_RING } from "#/components/ui/variants/focus";
import { textVariants } from "#/components/ui/variants/text";

const itemVariants = tv({
	extend: textVariants,
	slots: {
		group: "flex w-full flex-col gap-4",
		root: [
			"flex w-full flex-wrap items-center rounded-lg text-sm outline-none transition-colors duration-100",
			FOCUS_RING,
			"[a]:hover:bg-muted",
		],
		media: "flex shrink-0 items-center justify-center gap-2",
		content: "flex min-w-0 flex-1 flex-col gap-1",
		title: "line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium",
		description: "line-clamp-2 [&>a]:underline [&>a]:underline-offset-4",
		actions: "flex shrink-0 items-center gap-2",
		header: "flex basis-full items-center justify-between gap-2",
		footer: "flex basis-full items-center justify-between gap-2",
		separator: "my-2",
	},
	variants: {
		/** How loud to draw the row. `quiet` draws nothing until hovered as a link. */
		variant: {
			quiet: {},
			soft: { root: "bg-muted/50" },
			outlined: { root: "ring-1 ring-line" },
		},
		size: {
			sm: { root: "gap-2 px-2.5 py-2" },
			md: { root: "gap-2.5 px-3 py-2.5" },
		},
		/** What `Media` holds: an icon at text size, or an image cropped to a square. */
		media: {
			plain: {},
			icon: { media: "[--icon-size:--spacing(4)]" },
			image: { media: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover" },
		},
	},
	defaultVariants: { variant: "quiet", size: "md", media: "plain" },
});

const itemSlots = itemVariants();

type ItemVariants = VariantProps<typeof itemVariants>;

/** A list of `Root` rows, exposed to assistive tech as a list. */
export function Group({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ role: "list", className: itemSlots.group({ class: className }) },
			props,
		),
	});
}

/**
 * One row: optional `Media`, then `Content`, then `Actions`. A `Header` or
 * `Footer` takes a full line of its own. Use `render={<a />}` for a row that
 * navigates.
 */
export function Root({
	render,
	className,
	variant,
	size,
	...props
}: useRender.ComponentProps<"div"> & Pick<ItemVariants, "variant" | "size">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ className: itemSlots.root({ variant, size, class: className }) },
			props,
		),
	});
}

/** Holds the item's icon or image. */
export function Media({
	render,
	className,
	media,
	...props
}: useRender.ComponentProps<"div"> & Pick<ItemVariants, "media">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.media({ media, class: className }) }, props),
	});
}

/** The item's content. */
export function Content({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.content({ class: className }) }, props),
	});
}

/** The item's title. */
export function Title({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.title({ class: className }) }, props),
	});
}

/** The item's supporting text. */
export function Description({ render, className, ...props }: useRender.ComponentProps<"p">) {
	return useRender({
		defaultTagName: "p",
		render,
		props: mergeProps<"p">({ className: itemSlots.description({ class: className }) }, props),
	});
}

/** Holds the item's buttons. */
export function Actions({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.actions({ class: className }) }, props),
	});
}

/** A full-width line above the row's content. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.header({ class: className }) }, props),
	});
}

/** A full-width line below the row's content. */
export function Footer({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: itemSlots.footer({ class: className }) }, props),
	});
}

/** A line between rows of a `Group`. */
export function Separator({ className, ...props }: ComponentProps<typeof SeparatorUi>) {
	return (
		<SeparatorUi
			className={mergeClassName(className, (extra) => itemSlots.separator({ class: extra }))}
			{...props}
		/>
	);
}
