import { tv } from "tailwind-variants";

/**
 * Title, label and description, so each reads the same wherever it appears.
 */
export const textVariants = tv({
	slots: {
		title: "font-heading text-base leading-snug font-medium",
		label:
			"flex w-fit items-center gap-2 text-sm leading-snug font-medium select-none data-disabled:opacity-50",
		description: "text-sm leading-normal text-muted-fg",
	},
	variants: {
		size: {
			sm: { title: "text-sm", description: "text-xs" },
			md: {},
		},
	},
	defaultVariants: { size: "md" },
});
