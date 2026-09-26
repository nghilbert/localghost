import { tv } from "tailwind-variants";
import {
	DISABLED,
	FOCUS_RING,
	FOCUS_WITHIN_RING,
	INVALID_RING,
	INVALID_WITHIN_RING,
} from "./focus";

/**
 * The bordered box a text control is drawn in.
 */
export const controlVariants = tv({
	base: [
		"flex w-full min-w-0 items-center rounded-md border border-line bg-transparent",
		"text-sm outline-none transition-colors",
		DISABLED,
		"disabled:cursor-not-allowed data-disabled:cursor-not-allowed",
	],
	variants: {
		/** `self` when this element takes focus, `within` when it wraps the one that does. */
		focus: {
			self: [FOCUS_RING, INVALID_RING],
			within: [FOCUS_WITHIN_RING, INVALID_WITHIN_RING],
		},
		size: {
			sm: "h-7 px-2 text-xs [--icon-size:--spacing(3.5)]",
			md: "h-8 px-2.5",
			lg: "h-9 px-3",
		},
	},
	defaultVariants: { focus: "self", size: "md" },
});
