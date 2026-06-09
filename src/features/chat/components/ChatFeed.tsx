import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "#/lib/utils";

type Props = ComponentPropsWithoutRef<"section">;

export const ChatFeed = forwardRef<HTMLElement, Props>(({ className, children, ...props }, ref) => (
	<section
		ref={ref as React.Ref<HTMLElement>}
		aria-label="Conversation"
		aria-live="polite"
		aria-relevant="additions"
		className={cn("flex flex-col overflow-y-auto", className)}
		{...props}
	>
		{children}
	</section>
));
ChatFeed.displayName = "ChatFeed";
