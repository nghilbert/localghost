import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv } from "tailwind-variants";
import { FOCUS_RING } from "#/components/ui/variants/focus";

const markerVariants = tv({
	slots: {
		root: [
			"relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-fg",
			"[--icon-size:--spacing(4)] [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-fg",
			"rounded-sm outline-none",
			FOCUS_RING,
		],
		icon: "flex size-4 shrink-0 items-center justify-center",
		content: "min-w-0 wrap-break-word",
	},
});

const markerSlots = markerVariants();

/** A one-line note in a transcript: what the assistant did, or is doing. */
export function Marker({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: markerSlots.root({ class: className }) }, props),
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
