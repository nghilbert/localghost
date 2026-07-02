import { BrainIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { MessageStep } from "#/features/chat/components/ChatMessage/MessageStep";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ReasoningProps = { content: string; isThinking: boolean };

/**
 * A message's reasoning trace (`ThinkingPart`): streams open with a live timer
 * while the model thinks, then collapses once the answer starts. Thinking is
 * UI-only; it is never sent back to the model.
 */
export function Reasoning({ content, isThinking }: ReasoningProps) {
	const seconds = useElapsedSeconds(isThinking);
	const [duration, setDuration] = useState(0);
	const [open, setOpen] = useState(isThinking);

	// Follow the stream: open while thinking, collapse when the answer starts.
	// The user can reopen it afterwards.
	useEffect(() => {
		setOpen(isThinking);
		if (isThinking) setDuration(seconds);
	}, [isThinking, seconds]);

	const title = isThinking ? "Thinking" : duration ? `Thought for ${duration}s` : "Reasoning";

	return (
		<MessageStep
			icon={BrainIcon}
			title={
				isThinking && seconds ? (
					<>
						{title} <span className="tabular-nums opacity-70">· {seconds}s</span>
					</>
				) : (
					title
				)
			}
			open={open}
			onOpenChange={setOpen}
		>
			<div className="whitespace-pre-wrap border-t px-3 py-2.5 leading-relaxed text-muted-foreground">
				{content}
			</div>
		</MessageStep>
	);
}
