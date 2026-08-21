import { useSyncExternalStore } from "react";

/** mobile = viewport below the md breakpoint (768px) */
const mobileQuery = () => window.matchMedia("(max-width: 767px)");

/** Re-run `onChange` whenever the viewport crosses the mobile breakpoint. */
function subscribe(onChange: () => void) {
	const mediaQueryList = mobileQuery();
	mediaQueryList.addEventListener("change", onChange);
	return () => mediaQueryList.removeEventListener("change", onChange);
}

/** `true` while the viewport is below the mobile breakpoint; re-renders on resize. */
export function useIsMobile(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => mobileQuery().matches,
		() => false, // SSR has no viewport, so assume desktop until the client hydrates.
	);
}
