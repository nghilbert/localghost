import { tv } from "tailwind-variants";

/**
 * A floating panel and the element that positions it.
 *
 * Opening and closing use a transition rather than keyframes, so reopening a
 * panel while it is still closing cancels cleanly.
 */
export const surfaceVariants = tv({
	slots: {
		positioner: "isolate z-50 outline-none",
		popup: [
			"origin-(--transform-origin) rounded-md outline-none",
			"bg-surface text-surface-fg ring-1 ring-line",
			"transition-[opacity,transform] duration-100",
			"data-starting-style:opacity-0 data-ending-style:opacity-0",
			"side-none:transition-none",
		],
	},
	variants: {
		color: {
			neutral: {},
			/** Reads as a label on the page rather than a panel. */
			inverted: { popup: "bg-fg text-bg ring-transparent" },
		},
		/** How the panel pads and scrolls its contents. */
		density: {
			none: {},
			/** A scrolling list of options. */
			list: { popup: "max-h-(--available-height) min-w-32 overflow-x-hidden overflow-y-auto p-1" },
			/** Anything else. */
			pad: { popup: "p-2.5" },
		},
	},
	defaultVariants: { color: "neutral", density: "none" },
});
