import type { PropsWithChildren } from "react";
import { Spinner } from "#/components/ui/spinner";
import { cn } from "#/lib/utils";

const sideClassNames = {
	user: "rounded-br-xs bg-primary text-primary-foreground",
	assistant: "rounded-bl-xs bg-muted",
} as const;

type ChatBubbleProps = PropsWithChildren<{
	side: keyof typeof sideClassNames;
	pending?: boolean;
	seconds?: number;
}>;

/** The rounded message bubble shared by user/assistant messages and pending messages */
export function ChatBubble({ side, pending, seconds, children }: ChatBubbleProps) {
	return (
		<div
			role={pending ? "status" : undefined}
			className={cn(
				"w-fit max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
				sideClassNames[side],
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
		</div>
	);
}
