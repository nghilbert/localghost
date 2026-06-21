import { useEffect, useState } from "react";

/**
 * Whole seconds elapsed since `active` last became true, resetting to 0 whenever
 * it goes inactive. Drives the "Thinking… Ns" / "Warming up… Ns" wait labels so a
 * long wait reads as measured progress rather than a frozen spinner.
 */
export function useElapsedSeconds(active: boolean): number {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		if (!active) {
			setSeconds(0);
			return;
		}
		const start = Date.now();
		setSeconds(0);
		const id = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 1000);
		return () => clearInterval(id);
	}, [active]);

	return seconds;
}
