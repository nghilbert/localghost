import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Marker, MarkerContent, MarkerIcon } from "#/shared/components/ui/marker";
import { Spinner } from "#/shared/components/ui/spinner";

type ActivityMarkerProps = {
	label: ReactNode;
	/** Leading icon; defaults to a spinner. */
	icon?: LucideIcon;
	/** Elapsed seconds to show next to the label; omit to show none. */
	seconds?: number;
};

/**
 * A live "work in progress" row of the train of thought: an icon, a shimmering
 * label, and an elapsed timer. Purely presentational: the caller owns timing
 * (a frozen duration for a finished step, or its own live-ticking hook).
 */
export function ActivityMarker({ label, icon: Icon, seconds }: ActivityMarkerProps) {
	return (
		<Marker role="status" data-testid="activity-marker-status">
			<MarkerIcon>{Icon ? <Icon /> : <Spinner />}</MarkerIcon>
			<MarkerContent className="shimmer">
				{label}
				{seconds ? <span className="tabular-nums opacity-70"> · {seconds}s</span> : null}
			</MarkerContent>
		</Marker>
	);
}
