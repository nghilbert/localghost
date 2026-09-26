import { tv } from "tailwind-variants";

/**
 * One row in a list of options, plus the small pieces that sit in it.
 */
export const optionVariants = tv({
	slots: {
		item: [
			"relative flex w-full cursor-default items-center gap-1.5 select-none",
			"rounded-sm px-2 py-1.5 text-sm outline-hidden",
			"data-highlighted:bg-(--c-soft) data-highlighted:text-(--c)",
			"data-popup-open:bg-(--c-soft)",
			"data-disabled:pointer-events-none data-disabled:opacity-50",
		],
		indicator: "pointer-events-none absolute right-2 flex size-4 items-center justify-center",
		label: "px-2 py-1.5 text-xs font-medium text-muted-fg",
		shortcut: "ml-auto text-xs tracking-widest text-muted-fg",
		separator: "-mx-1 my-1 h-px bg-line",
	},
	variants: {
		color: {
			neutral: { item: "[--c:var(--color-fg)] [--c-soft:var(--color-neutral-soft)]" },
			danger: {
				item: "text-danger [--c:var(--color-danger)] [--c-soft:var(--color-danger-soft)]",
			},
		},
		/** Leaves room on the left, to line up with rows that have an icon. */
		inset: { true: { item: "pl-8", label: "pl-8" } },
		/** Leaves room on the right for a check mark. */
		indicator: { true: { item: "pr-8" } },
	},
	defaultVariants: { color: "neutral" },
});
