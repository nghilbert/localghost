import { tv } from "tailwind-variants";
import { DISABLED, FOCUS_RING, INVALID_RING } from "./focus";

/**
 * The small box a checkbox or radio is drawn as.
 */
export const choiceVariants = tv({
	base: [
		"relative flex size-4 shrink-0 items-center justify-center",
		"border border-line transition-colors outline-none",
		/* Widens the tap area without changing the drawn size. */
		"after:absolute after:-inset-x-3 after:-inset-y-2",
		FOCUS_RING,
		INVALID_RING,
		"data-checked:border-primary data-checked:bg-primary data-checked:text-primary-fg",
		DISABLED,
		"data-disabled:cursor-not-allowed",
	],
	variants: {
		shape: {
			square: "rounded-sm",
			round: "rounded-full",
		},
	},
	defaultVariants: { shape: "square" },
});
