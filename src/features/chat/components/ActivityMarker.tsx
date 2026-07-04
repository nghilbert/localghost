import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Marker, MarkerContent, MarkerIcon } from "#/components/ui/marker";
import { Spinner } from "#/components/ui/spinner";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

type ActivityMarkerProps = {
	label: ReactNode;
	/** Leading icon; defaults to a spinner. */
	icon?: LucideIcon;
	/** Frozen duration for a finished step; omit to tick live from mount. */
	seconds?: number;
};

/**
 * A live "work in progress" row of the train of thought: an icon, a shimmering
 * label, and an elapsed timer. With no `seconds` it ticks from mount, so mount
 * it only while the activity is actually running.
 */
export function ActivityMarker({ label, icon: Icon, seconds }: ActivityMarkerProps) {
	const ticking = useElapsedSeconds(seconds === undefined);
	const elapsed = seconds ?? ticking;
	return (
		<Marker role="status">
			<MarkerIcon>{Icon ? <Icon /> : <Spinner />}</MarkerIcon>
			<MarkerContent className="shimmer">
				{label}
				{elapsed ? <span className="tabular-nums opacity-70"> · {elapsed}s</span> : null}
			</MarkerContent>
		</Marker>
	);
}
