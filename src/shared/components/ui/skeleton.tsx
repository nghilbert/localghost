import type { ComponentProps } from "react";
import { cn } from "#/shared/lib/utils";

type SkeletonProps = ComponentProps<"div"> & { inline?: boolean };

export function Skeleton({ className, inline = false, ...props }: SkeletonProps) {
	const Tag = inline ? "span" : "div";
	return (
		<Tag
			data-slot="skeleton"
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	);
}
