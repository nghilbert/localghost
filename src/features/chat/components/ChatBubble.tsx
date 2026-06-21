import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "#/lib/utils";

const sideClasses = {
	user: "rounded-br-xs bg-primary text-primary-foreground",
	assistant: "rounded-bl-xs bg-muted",
} as const;

type Props = ComponentProps<"div"> & {
	side: keyof typeof sideClasses;
	asChild?: boolean;
};

/**
 * The chat surface primitive: a rounded message bubble whose tail corner and
 * colors follow `side`. Reused by user/assistant messages and the wait
 * indicator so every bubble shares one shape. Pass `asChild` to style an
 * existing element (e.g. Streamdown) as the bubble without an extra wrapper.
 * Layout-agnostic — the parent owns max-width and margins via `className`.
 */
export function ChatBubble({ side, asChild, className, ...props }: Props) {
	const Comp = asChild ? Slot.Root : "div";
	return (
		<Comp
			className={cn("w-fit rounded-2xl px-4 py-2.5 text-sm", sideClasses[side], className)}
			{...props}
		/>
	);
}
