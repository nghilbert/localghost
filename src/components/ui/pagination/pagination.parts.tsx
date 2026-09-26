import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { Button, type ButtonProps } from "#/components/ui/button";

const paginationVariants = tv({
	slots: {
		root: "flex w-full justify-center",
		list: "flex items-center gap-0.5",
		ellipsis: "flex size-8 items-center justify-center",
	},
});

const paginationSlots = paginationVariants();

/** A `<nav>` named "Pagination". Pass `aria-label` to name it after what it pages. */
export function Root({ render, className, ...props }: useRender.ComponentProps<"nav">) {
	return useRender({
		defaultTagName: "nav",
		render,
		props: mergeProps<"nav">(
			{ "aria-label": "Pagination", className: paginationSlots.root({ class: className }) },
			props,
		),
	});
}

/** The row of page controls. */
export function List({ render, className, ...props }: useRender.ComponentProps<"ul">) {
	return useRender({
		defaultTagName: "ul",
		render,
		props: mergeProps<"ul">({ className: paginationSlots.list({ class: className }) }, props),
	});
}

/** Holds one pagination control. */
export function Item({ render, ...props }: useRender.ComponentProps<"li">) {
	return useRender({ defaultTagName: "li", render, props });
}

/**
 * One page, as a button. `current` marks the page being shown, for assistive tech
 * as well as visually.
 */
export function Link({ current = false, ...props }: ButtonProps & { current?: boolean }) {
	return (
		<Button
			color="neutral"
			variant={current ? "outlined" : "quiet"}
			iconOnly
			aria-current={current ? "page" : undefined}
			{...props}
		/>
	);
}

/** Steps back a page. The text label hides on narrow screens, leaving the chevron. */
export function Previous({ children = "Previous", ...props }: ButtonProps) {
	return (
		<Button color="neutral" variant="quiet" aria-label="Previous page" {...props}>
			<ChevronLeftIcon />
			<span className="hidden sm:block">{children}</span>
		</Button>
	);
}

/** Steps forward a page. The text label hides on narrow screens, leaving the chevron. */
export function Next({ children = "Next", ...props }: ButtonProps) {
	return (
		<Button color="neutral" variant="quiet" aria-label="Next page" {...props}>
			<span className="hidden sm:block">{children}</span>
			<ChevronRightIcon />
		</Button>
	);
}

/** Stands in for the pages that are not listed. */
export function Ellipsis({ render, className, ...props }: useRender.ComponentProps<"span">) {
	return useRender({
		defaultTagName: "span",
		render,
		props: mergeProps<"span">(
			{
				"aria-hidden": true,
				className: paginationSlots.ellipsis({ class: className }),
				children: <MoreHorizontalIcon />,
			},
			props,
		),
	});
}
