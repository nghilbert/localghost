import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv } from "tailwind-variants";
import { textVariants } from "#/components/ui/variants/text";

const emptyVariants = tv({
	extend: textVariants,
	slots: {
		root: "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-balance",
		media:
			"mb-2 flex size-10 items-center justify-center rounded-md bg-muted text-fg [--icon-size:--spacing(5)]",
		description: "max-w-sm text-sm/relaxed",
		actions: "flex flex-wrap items-center justify-center gap-2",
	},
});

const emptySlots = emptyVariants();

/** Fills a view that has nothing to show yet, centered. */
export function Root({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: emptySlots.root({ class: className }) }, props),
	});
}

/** Holds the empty state's icon. */
export function Media({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: emptySlots.media({ class: className }) }, props),
	});
}

/** An `<h2>` by default. Pick the level that fits the page with `render={<h3 />}`. */
export function Title({ render, className, ...props }: useRender.ComponentProps<"h2">) {
	return useRender({
		defaultTagName: "h2",
		render,
		props: mergeProps<"h2">({ className: emptySlots.title({ class: className }) }, props),
	});
}

/** The empty state's supporting text. */
export function Description({ render, className, ...props }: useRender.ComponentProps<"p">) {
	return useRender({
		defaultTagName: "p",
		render,
		props: mergeProps<"p">({ className: emptySlots.description({ class: className }) }, props),
	});
}

/** Holds the empty state's buttons. */
export function Actions({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: emptySlots.actions({ class: className }) }, props),
	});
}
