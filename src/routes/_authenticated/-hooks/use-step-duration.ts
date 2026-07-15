import { useState } from "react";
import { useElapsedSeconds } from "#/routes/_authenticated/-hooks/use-elapsed-seconds";

/**
 * Times one train-of-thought step: `seconds` ticks live while `active`,
 * `duration` freezes the final value once inactive so a finished step can read
 * "Thought for 8s". A step never active this session reports `0`.
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
