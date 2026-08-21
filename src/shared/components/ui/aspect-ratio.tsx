import type { ComponentProps, CSSProperties } from "react";
import { cn } from "#/shared/lib/utils";

export function AspectRatio({
	ratio,
	className,
	...props
}: ComponentProps<"div"> & { ratio: number }) {
	const style: CSSProperties & { "--ratio": number } = { "--ratio": ratio };
	return (
		<div
			data-slot="aspect-ratio"
			style={style}
			className={cn("relative aspect-(--ratio)", className)}
			{...props}
		/>
	);
}
