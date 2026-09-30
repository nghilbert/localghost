import type { ReactNode } from "react";
import { formatSeconds } from "#/lib/format";
import { Marker, MarkerContent, MarkerIcon } from "./Marker";

type ActivityMarkerProps = {
	label: ReactNode;
	icon: ReactNode;
	/** Elapsed seconds to show next to the label; omit to show none. */
	seconds?: number;
};

/** A row for a step in progress: an icon, a shimmering label, and the seconds elapsed. */
export function ActivityMarker({ label, icon, seconds }: ActivityMarkerProps) {
	return (
		<Marker role="status">
			<MarkerIcon>{icon}</MarkerIcon>
			<MarkerContent className="shimmer">
				{label}
				{seconds ? (
					<span className="tabular-nums opacity-70"> · {formatSeconds(seconds)}</span>
				) : null}
			</MarkerContent>
		</Marker>
	);
}
