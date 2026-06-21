import { useCallback, useEffect, useRef, useState } from "react";

/** Distance from the bottom (px) within which the view counts as pinned. */
const PIN_THRESHOLD = 48;

/**
 * Keeps a scroll container pinned to the bottom as content streams in, while
 * yielding the moment the user scrolls up to read history (re-pinning when they
 * return to the bottom). Attach `scrollRef` and `onScroll={handleScroll}` to the
 * scroll element, and render a "jump to latest" control while `showButton` is true.
 */
export function useStickToBottom() {
	const scrollRef = useRef<HTMLElement>(null);
	const pinnedRef = useRef(true);
	const [showButton, setShowButton] = useState(false);

	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior });
	}, []);

	const handleScroll = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const pinned = el.scrollHeight - el.scrollTop - el.clientHeight < PIN_THRESHOLD;
		pinnedRef.current = pinned;
		setShowButton(!pinned);
	}, []);

	// Runs after every render — i.e. whenever new content streams in — keeping the
	// view at the bottom unless the user has scrolled away to read earlier messages.
	useEffect(() => {
		if (pinnedRef.current) scrollToBottom("auto");
	});

	return { scrollRef, showButton, scrollToBottom, handleScroll };
}
