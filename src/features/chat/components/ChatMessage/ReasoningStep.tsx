import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { ChatMarkdown } from "#/features/chat/components/ChatMarkdown";
import { Marker, MarkerContent } from "#/features/chat/components/Marker";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";

type ReasoningStepProps = { content: string; isThinking: boolean };

/**
 * A reasoning step: open with a timer while the model thinks, then collapsed to
 * "Thought for Ns", which opens on click.
 */
export function ReasoningStep({ content, isThinking }: ReasoningStepProps) {
	const { seconds, duration } = useStepDuration(isThinking);
	// Open while thinking, closed after. A click overrides that until thinking starts or stops.
	const [openOverride, setOpenOverride] = useState<boolean | null>(null);
	const [prevThinking, setPrevThinking] = useState(isThinking);
	if (prevThinking !== isThinking) {
		setPrevThinking(isThinking);
		setOpenOverride(null);
	}

	const open = openOverride ?? isThinking;
	const label = duration ? `Thought for ${duration}s` : "Reasoning";

	return (
		<div className="flex flex-col gap-1.5">
			{isThinking ? (
				<ActivityMarker label="Thinking" seconds={seconds} />
			) : (
				<Marker
					layout="separator"
					render={
						<Button
							color="neutral"
							variant="quiet"
							aria-expanded={open}
							onClick={() => setOpenOverride(!open)}
						/>
					}
				>
					<MarkerContent className="flex items-center gap-1 hover:text-fg">
						{label}
						<ChevronRightIcon
							className="size-3 transition-transform data-open:rotate-90"
							data-open={open ? "" : undefined}
						/>
					</MarkerContent>
				</Marker>
			)}
			{open && content && (
				<ChatMarkdown
					isStreaming={isThinking}
					className="ml-2 border-l border-line pl-3 text-xs leading-relaxed text-muted-fg"
				>
					{content}
				</ChatMarkdown>
			)}
		</div>
	);
}
