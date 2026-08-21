import type { ComponentProps } from "react";
import { cn } from "#/shared/lib/utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: generic reusable label. The control association is made at the call site (htmlFor or nesting), which this rule cannot see.
		<label
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-disabled:pointer-events-none group-data-disabled:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}
