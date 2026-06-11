import type { ComponentPropsWithRef } from "react";
import { cn } from "#/lib/utils";

type Props = ComponentPropsWithRef<"section">;

export function ChatFeed({ className, children, ...props }: Props) {
	return (
		<section
			aria-label="Conversation"
			aria-live="polite"
			aria-relevant="additions"
			className={cn("flex flex-col overflow-y-auto", className)}
			{...props}
		>
			{children}
		</section>
	);
}
