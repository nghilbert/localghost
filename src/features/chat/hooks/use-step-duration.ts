import { useState } from "react";
import { useElapsedSeconds } from "./use-elapsed-seconds";

/**
 * Times a step: `seconds` counts while `active`, and `duration` keeps the final value
 * once it stops, for "Thought for 8s".
 */
export function useStepDuration(active: boolean): { seconds: number; duration: number } {
	const seconds = useElapsedSeconds(active);
	const [duration, setDuration] = useState(0);
	const [prevActive, setPrevActive] = useState(active);

	if (prevActive !== active) {
		setPrevActive(active);
		if (active) setDuration(0);
	}
	if (active && seconds > duration) setDuration(seconds);

	return { seconds, duration };
}
