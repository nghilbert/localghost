import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { Collapsible } from "#/components/ui/collapsible";
import { ActivityMarker } from "#/features/chat/components/ActivityMarker";
import { LitBulbIcon, SpinningBulbIcon } from "#/features/chat/components/BulbIcons";
import { ChatMarkdown } from "#/features/chat/components/ChatMarkdown";
import { Marker, MarkerContent, MarkerIcon } from "#/features/chat/components/Marker";
import { useStepDuration } from "#/features/chat/hooks/use-step-duration";
import { formatSeconds } from "#/lib/format";

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
	const label = duration ? `Thought for ${formatSeconds(duration)}` : "Reasoning";

	return (
		<Collapsible.Root open={open} onOpenChange={setOpenOverride} className="flex flex-col gap-1.5">
			{isThinking ? (
				<ActivityMarker label="Thinking" icon={<SpinningBulbIcon />} seconds={seconds} />
			) : (
				<Marker className="w-fit" render={<Collapsible.Trigger />}>
					<MarkerIcon>
						<LitBulbIcon />
					</MarkerIcon>
					<MarkerContent className="flex items-center gap-1 hover:text-fg">
						{label}
						<ChevronRightIcon className="size-3 transition-transform in-data-panel-open:rotate-90" />
					</MarkerContent>
				</Marker>
			)}
			{content && (
				<Collapsible.Panel>
					<ChatMarkdown
						isStreaming={isThinking}
						className="ml-2 pl-3 text-xs leading-relaxed text-muted-fg"
					>
						{content}
					</ChatMarkdown>
				</Collapsible.Panel>
			)}
		</Collapsible.Root>
	);
}
