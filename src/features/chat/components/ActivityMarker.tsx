import type { ReactNode } from "react";
import { Marker, MarkerContent, MarkerIcon } from "#/components/ui/marker";
import { Spinner } from "#/components/ui/spinner";
import { useElapsedSeconds } from "#/features/chat/hooks/use-elapsed-seconds";

/**
 * The chat's single "work in progress" row: a spinner, a label, and an elapsed
 * timer that starts when the marker mounts. Mount it only while the activity is
 * actually running.
 */
export function ActivityMarker({ label }: { label: ReactNode }) {
	const seconds = useElapsedSeconds(true);
	return (
		<Marker role="status">
			<MarkerIcon>
				<Spinner />
			</MarkerIcon>
			<MarkerContent>
				{label}
				{seconds ? <span className="tabular-nums opacity-70"> · {seconds}s</span> : null}
			</MarkerContent>
		</Marker>
	);
}
