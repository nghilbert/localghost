import type { ComponentProps } from "react";
import { cn } from "tailwind-variants";
import { Badge } from "#/components/ui/badge";

/* Badge has no success or warning color, so these set its color variables directly. */
const EXTRA_TONES = {
	success:
		"[--c:var(--color-success)] [--c-soft:color-mix(in_oklch,var(--color-success)_10%,transparent)]",
	warning:
		"[--c:var(--color-warning)] [--c-soft:color-mix(in_oklch,var(--color-warning)_10%,transparent)]",
} as const;

/** The color a status reads in: good, needs attention, failing, or not known yet. */
export type StatusTone = keyof typeof EXTRA_TONES | "danger" | "neutral";

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "color" | "variant"> & {
	tone: StatusTone;
};

/** A soft badge colored by how a status reads, such as an endpoint's health or a model's fit. */
export function StatusBadge({ tone, className, ...props }: StatusBadgeProps) {
	if (tone === "danger" || tone === "neutral") {
		return <Badge variant="soft" color={tone} className={className} {...props} />;
	}
	return <Badge variant="soft" className={cn(EXTRA_TONES[tone], className)} {...props} />;
}
