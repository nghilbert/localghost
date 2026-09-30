import { useSyncExternalStore } from "react";

/** Matches a viewport narrower than the `md` breakpoint. */
const mobileQuery = () => window.matchMedia("(max-width: 767px)");

function subscribe(onChange: () => void) {
	const mediaQueryList = mobileQuery();
	mediaQueryList.addEventListener("change", onChange);
	return () => mediaQueryList.removeEventListener("change", onChange);
}

/** Whether the viewport is narrower than the `md` breakpoint. */
export function useIsMobile(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => mobileQuery().matches,
		// The server has no viewport, so it renders the desktop layout.
		() => false,
	);
}
