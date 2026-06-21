import { Spinner } from "#/components/ui/spinner";
import { ChatBubble } from "#/features/chat/components/ChatBubble";

type Props = { label: string; seconds: number };

/**
 * The single inline wait indicator for chat: a spinner with an honest label and
 * elapsed-seconds counter, styled as an assistant bubble. Reused for warming up,
 * thinking, and in-flight tool calls so every wait reads the same.
 */
export function StatusIndicator({ label, seconds }: Props) {
	return (
		<ChatBubble
			side="assistant"
			role="status"
			className="flex items-center gap-2 text-muted-foreground"
		>
			<Spinner aria-hidden className="size-4" />
			<span>{label}</span>
			{seconds > 0 && <span className="tabular-nums opacity-70">· {seconds}s</span>}
		</ChatBubble>
	);
}
