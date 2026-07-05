import { code } from "@streamdown/code";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { Marker, MarkerContent } from "#/components/ui/marker";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";

type ReasoningStepProps = { content: string; isThinking: boolean };

/**
 * One reasoning step of the train of thought: streams open with a live timer
 * while the model thinks, then collapses to a "Thought for Ns" divider that
 * reopens on click. Thinking is UI-only; it is never sent back to the model.
 */
export function ReasoningStep({ content, isThinking }: ReasoningStepProps) {
	const { seconds, duration } = useStepDuration(isThinking);
	// Follow the stream: open while thinking, collapse when it ends. A manual
	// toggle overrides until the next thinking transition clears it.
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
					variant="separator"
					data-testid="activity-trail-marker"
					render={<button type="button" onClick={() => setOpenOverride(!open)} />}
				>
					<MarkerContent className="flex items-center gap-1 hover:text-foreground">
						{label}
						<ChevronRightIcon
							className="size-3 transition-transform data-[open=true]:rotate-90"
							data-open={open}
						/>
					</MarkerContent>
				</Marker>
			)}
			{open && content && (
				<Streamdown
					plugins={{ code }}
					linkSafety={{ enabled: false }}
					isAnimating={isThinking}
					className="ml-2 border-l pl-3 text-xs leading-relaxed text-muted-foreground"
				>
					{content}
				</Streamdown>
			)}
		</div>
	);
}
