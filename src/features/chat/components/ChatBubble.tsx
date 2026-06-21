import { Slot } from "radix-ui";
import type { PropsWithChildren } from "react";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";

const sideClasses = {
	user: "max-w-[75%] rounded-br-xs bg-primary text-primary-foreground",
	assistant: "max-w-[85%] rounded-bl-xs bg-muted",
} as const;

type ChatBubbleProps = PropsWithChildren<{
	side: keyof typeof sideClasses;
	/** Render an existing element (e.g. Streamdown) as the bubble, no wrapper. */
	asChild?: boolean;
	/** Show a spinner with the children as its label — a wait/status bubble. */
	pending?: boolean;
	/** Elapsed seconds appended to a `pending` bubble; hidden when falsy. */
	seconds?: number;
}>;

/** The rounded message bubble shared by user/assistant messages and waits; owns its shape, color, padding, and width from `side`. */
export function ChatBubble({ side, children, asChild, pending, seconds }: ChatBubbleProps) {
	const Comp = !pending && asChild ? Slot.Root : "div";
	return (
		<Comp
			role={pending ? "status" : undefined}
			className={cn(
				"w-fit rounded-2xl px-4 py-2.5 text-sm",
				sideClasses[side],
				pending && "flex items-center gap-2 text-muted-foreground",
			)}
		>
			{pending ? (
				<>
					<Spinner aria-hidden className="size-4" />
					<span>{children}</span>
					{seconds ? <span className="tabular-nums opacity-70">· {seconds}s</span> : null}
				</>
			) : (
				children
			)}
		</Comp>
	);
}
