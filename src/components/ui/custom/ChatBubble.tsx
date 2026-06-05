import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { cn } from "#/lib/utils";

export type MessageSender = "user" | "assistant" | "system" | "tool";

type Props = Omit<ComponentPropsWithoutRef<"article">, "role"> & {
	senderRole: MessageSender;
};

const senderLabel: Record<MessageSender, string> = {
	user: "You",
	assistant: "Assistant",
	system: "System",
	tool: "Tool",
};

export const ChatBubble = forwardRef<HTMLElement, Props>(
	({ senderRole, className, children, ...props }, ref) => (
		<article
			ref={ref as React.Ref<HTMLElement>}
			aria-label={`${senderLabel[senderRole]} message`}
			data-sender={senderRole}
			className={cn("flex gap-3 py-4", senderRole === "user" && "flex-row-reverse", className)}
			{...props}
		>
			{children}
		</article>
	),
);
ChatBubble.displayName = "ChatBubble";
