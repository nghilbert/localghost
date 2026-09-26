import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Spinner } from "#/components/ui/spinner";
import { Marker, MarkerContent, MarkerIcon } from "./Marker";

type ActivityMarkerProps = {
	label: ReactNode;
	/** Leading icon; defaults to a spinner. */
	icon?: LucideIcon;
	/** Elapsed seconds to show next to the label; omit to show none. */
	seconds?: number;
};

/** A row for a step in progress: an icon, a shimmering label, and the seconds elapsed. */
export function ActivityMarker({ label, icon: Icon, seconds }: ActivityMarkerProps) {
	return (
		<Marker role="status">
			<MarkerIcon>{Icon ? <Icon /> : <Spinner />}</MarkerIcon>
			<MarkerContent className="shimmer">
				{label}
				{seconds ? <span className="tabular-nums opacity-70"> · {seconds}s</span> : null}
			</MarkerContent>
		</Marker>
	);
}
