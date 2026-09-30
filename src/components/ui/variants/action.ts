import { tv, type VariantProps } from "tailwind-variants";
import { DISABLED, FOCUS_RING } from "./focus";

/**
 * Anything clickable that is drawn as a button.
 *
 * `color` sets three CSS variables and `variant` reads them, so the two can be
 * combined freely and adding a color costs three lines.
 */
export const actionVariants = tv({
	base: [
		"inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent",
		"text-sm font-medium whitespace-nowrap select-none outline-none transition-colors",
		FOCUS_RING,
		DISABLED,
		"disabled:pointer-events-none data-disabled:pointer-events-none",
	],
	variants: {
		color: {
			primary:
				"[--c:var(--color-primary)] [--c-fg:var(--color-primary-fg)] [--c-soft:var(--color-primary-soft)]",
			neutral:
				"[--c:var(--color-neutral)] [--c-fg:var(--color-neutral-fg)] [--c-soft:var(--color-neutral-soft)]",
			danger:
				"[--c:var(--color-danger)] [--c-fg:var(--color-danger-fg)] [--c-soft:var(--color-danger-soft)]",
		},
		/** How loud to draw the color, loudest first. */
		variant: {
			solid: "bg-(--c) text-(--c-fg) hover:bg-(--c)/90",
			soft: "bg-(--c-soft) text-(--c) hover:bg-(--c)/20",
			outlined: "border-line text-(--c) hover:bg-(--c-soft) aria-expanded:bg-(--c-soft)",
			quiet: "text-(--c) hover:bg-(--c-soft) aria-expanded:bg-(--c-soft)",
		},
		size: {
			sm: "h-7 px-2.5 text-xs [--icon-size:--spacing(3.5)]",
			md: "h-8 px-3",
			lg: "h-9 px-4",
		},
		/** Draws a square that fits one icon, with no horizontal padding. */
		iconOnly: { true: "px-0", false: "" },
	},
	compoundVariants: [
		{ size: "sm", iconOnly: true, class: "w-7" },
		{ size: "md", iconOnly: true, class: "w-8" },
		{ size: "lg", iconOnly: true, class: "w-9" },
	],
	defaultVariants: { color: "primary", variant: "solid", size: "md", iconOnly: false },
});

type ActionProps = VariantProps<typeof actionVariants>;

/** A value of the `color` axis. */
export type ActionColor = NonNullable<ActionProps["color"]>;
/** A value of the `variant` axis. */
export type ActionVariant = NonNullable<ActionProps["variant"]>;

/**
 * These props, narrowed to the values a component actually draws.
 *
 * `ActionVariants<"outlined" | "quiet">` accepts two of the four. Prefer
 * narrowing: a value a component never draws should not be typeable.
 */
export type ActionVariants<
	V extends ActionVariant = ActionVariant,
	C extends ActionColor = ActionColor,
> = Omit<ActionProps, "color" | "variant"> & {
	color?: C | undefined;
	variant?: V | undefined;
};
