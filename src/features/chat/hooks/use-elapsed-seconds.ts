import { useEffect, useState } from "react";

/** Whole seconds since `active` became true, back to 0 when it turns false. */
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
