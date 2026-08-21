import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { ArrowDownIcon } from "lucide-react";
import {
	type ComponentProps,
	createContext,
	type ReactNode,
	type RefObject,
	use,
	useEffect,
	useRef,
} from "react";
import { Button } from "#/shared/components/ui/button";
import { ScrollBar } from "#/shared/components/ui/scroll-area";
import { cn } from "#/shared/lib/utils";

type DefaultScrollPosition = "start" | "end" | "last-anchor";
type ButtonDirection = "start" | "end";

/** Distance from an edge (px) still treated as being at that edge. */
const EDGE_THRESHOLD = 24;

function scrollElementToBottom(viewport: HTMLDivElement, behavior: ScrollBehavior) {
	viewport.scrollTo({ top: viewport.scrollHeight, behavior });
}

type MessageScrollerContextValue = {
	viewportRef: RefObject<HTMLDivElement | null>;
	contentRef: RefObject<HTMLDivElement | null>;
	spacerRef: RefObject<HTMLDivElement | null>;
	markUserIntent: () => void;
	scrollToEnd: (behavior?: ScrollBehavior) => void;
	scrollToStart: (behavior?: ScrollBehavior) => void;
};

const MessageScrollerContext = createContext<MessageScrollerContextValue | null>(null);

function useMessageScrollerContext(): MessageScrollerContextValue {
	const ctx = use(MessageScrollerContext);
	if (!ctx) {
		throw new Error("MessageScroller components must be used within <MessageScrollerProvider>");
	}
	return ctx;
}

/**
 * Owns transcript scrolling: pins to the newest content while the user is at the
 * bottom (`autoScroll`) and snaps each newly appended anchor to the top (`last-anchor`).
 */
export function MessageScrollerProvider({
	autoScroll = false,
	defaultScrollPosition = "end",
	children,
}: {
	autoScroll?: boolean;
	defaultScrollPosition?: DefaultScrollPosition;
	children?: ReactNode;
}) {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const contentRef = useRef<HTMLDivElement | null>(null);
	const spacerRef = useRef<HTMLDivElement | null>(null);

	const pinRef = useRef<"bottom" | "anchor" | "free">("free");
	const userIntentRef = useRef(false);
	const initializedRef = useRef(false);
	const anchorCountRef = useRef(0);
	const spacerHeightRef = useRef(0);

	// Exposed through context for the scrollbar drag and the scroll-to-edge buttons; the
	// transcript mechanics that only fire from the effect's own observers live inside it.
	const markUserIntent = () => {
		userIntentRef.current = true;
	};

	const scrollToEnd = (behavior: ScrollBehavior = "smooth") => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		pinRef.current = "bottom";
		scrollElementToBottom(viewport, behavior);
	};

	const scrollToStart = (behavior: ScrollBehavior = "smooth") => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		pinRef.current = "free";
		viewport.scrollTo({ top: 0, behavior });
	};

	useEffect(() => {
		const viewport = viewportRef.current;
		const content = contentRef.current;
		if (!viewport || !content) return;

		pinRef.current =
			defaultScrollPosition === "last-anchor"
				? "anchor"
				: defaultScrollPosition === "end"
					? "bottom"
					: "free";
		initializedRef.current = false;
		anchorCountRef.current = 0;

		const anchorLastToTop = (behavior: ScrollBehavior) => {
			const anchors = viewport.querySelectorAll<HTMLElement>("[data-scroll-anchor]");
			const anchor = anchors[anchors.length - 1];
			if (!anchor) return;
			const top =
				anchor.getBoundingClientRect().top -
				viewport.getBoundingClientRect().top +
				viewport.scrollTop;
			viewport.scrollTo({ top: Math.max(0, top), behavior });
		};

		// Grow a spacer under the last anchor so it can reach the top even when the turn
		// below it is shorter than the viewport.
		const updateSpacer = () => {
			const spacer = spacerRef.current;
			if (!spacer) return;
			const anchors = content.querySelectorAll<HTMLElement>("[data-scroll-anchor]");
			const anchor = anchors[anchors.length - 1];
			if (!anchor) {
				if (spacerHeightRef.current !== 0) {
					spacerHeightRef.current = 0;
					spacer.style.height = "0px";
				}
				return;
			}
			const anchorTop = anchor.getBoundingClientRect().top - content.getBoundingClientRect().top;
			const realContentHeight = content.scrollHeight - spacerHeightRef.current;
			const lastTurnHeight = realContentHeight - anchorTop;
			const needed = Math.max(0, viewport.clientHeight - lastTurnHeight);
			if (needed !== spacerHeightRef.current) {
				spacerHeightRef.current = needed;
				spacer.style.height = `${needed}px`;
			}
		};

		const applyPin = (behavior: ScrollBehavior) => {
			if (pinRef.current === "anchor") anchorLastToTop(behavior);
			else if (pinRef.current === "bottom") scrollElementToBottom(viewport, behavior);
		};

		const markIntent = () => {
			userIntentRef.current = true;
		};

		// Only a real gesture reassigns the pin; programmatic scrolls do not. Base UI's
		// overflow-edge state drives the scroll-to-edge buttons' visibility separately.
		const onScroll = () => {
			if (!userIntentRef.current) return;
			userIntentRef.current = false;
			const distance = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop;
			pinRef.current = distance <= EDGE_THRESHOLD ? "bottom" : "free";
		};

		const onContentResize = () => {
			updateSpacer();
			const anchorCount = content.querySelectorAll("[data-scroll-anchor]").length;

			if (!initializedRef.current) {
				initializedRef.current = true;
				anchorCountRef.current = anchorCount;
				applyPin("auto");
				return;
			}

			// A newly appended anchor (a new turn) snaps to the top.
			if (anchorCount > anchorCountRef.current) {
				anchorCountRef.current = anchorCount;
				pinRef.current = "anchor";
				applyPin("smooth");
				return;
			}

			// Content grew in place (streaming): keep the active pin, following the bottom
			// only when autoScroll is on.
			if (pinRef.current === "anchor" || (pinRef.current === "bottom" && autoScroll)) {
				applyPin("auto");
			}
		};

		const resizeObserver = new ResizeObserver(onContentResize);
		resizeObserver.observe(content);
		viewport.addEventListener("scroll", onScroll, { passive: true });
		viewport.addEventListener("wheel", markIntent, { passive: true });
		viewport.addEventListener("touchmove", markIntent, { passive: true });
		viewport.addEventListener("keydown", markIntent);
		onScroll();

		return () => {
			resizeObserver.disconnect();
			viewport.removeEventListener("scroll", onScroll);
			viewport.removeEventListener("wheel", markIntent);
			viewport.removeEventListener("touchmove", markIntent);
			viewport.removeEventListener("keydown", markIntent);
		};
	}, [autoScroll, defaultScrollPosition]);

	return (
		<MessageScrollerContext.Provider
			value={{
				viewportRef,
				contentRef,
				spacerRef,
				markUserIntent,
				scrollToEnd,
				scrollToStart,
			}}
		>
			{children}
		</MessageScrollerContext.Provider>
	);
}

export function MessageScroller({ className, children, ...props }: ScrollAreaPrimitive.Root.Props) {
	const { markUserIntent } = useMessageScrollerContext();
	return (
		<ScrollAreaPrimitive.Root
			data-slot="message-scroller"
			overflowEdgeThreshold={EDGE_THRESHOLD}
			className={cn(
				"group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
				className,
			)}
			{...props}
		>
			{children}
			<ScrollBar
				onPointerDown={markUserIntent}
				className="opacity-0 transition-opacity duration-200 data-hovering:opacity-100 data-scrolling:opacity-100"
			/>
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

export function MessageScrollerViewport({
	className,
	...props
}: ScrollAreaPrimitive.Viewport.Props) {
	const { viewportRef } = useMessageScrollerContext();
	return (
		<ScrollAreaPrimitive.Viewport
			ref={viewportRef}
			data-slot="message-scroller-viewport"
			className={cn(
				"size-full min-h-0 min-w-0 scroll-fade-b overscroll-contain contain-content",
				className,
			)}
			{...props}
		/>
	);
}

export function MessageScrollerContent({
	className,
	children,
	...props
}: ScrollAreaPrimitive.Content.Props) {
	const { contentRef, spacerRef } = useMessageScrollerContext();
	return (
		<ScrollAreaPrimitive.Content
			ref={contentRef}
			data-slot="message-scroller-content"
			className={cn("flex h-max min-h-full flex-col gap-6", className)}
			{...props}
		>
			{children}
			<div ref={spacerRef} data-slot="message-scroller-spacer" aria-hidden />
		</ScrollAreaPrimitive.Content>
	);
}

export function MessageScrollerItem({
	className,
	scrollAnchor = false,
	messageId,
	...props
}: ComponentProps<"div"> & { scrollAnchor?: boolean; messageId?: string }) {
	return (
		<div
			data-slot="message-scroller-item"
			data-message-id={messageId}
			data-scroll-anchor={scrollAnchor ? "" : undefined}
			className={cn(
				"min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
				className,
			)}
			{...props}
		/>
	);
}

export function MessageScrollerButton({
	direction = "end",
	className,
	children,
	variant = "secondary",
	size = "icon-sm",
	onClick,
	...props
}: ComponentProps<typeof Button> & { direction?: ButtonDirection }) {
	const { scrollToEnd, scrollToStart } = useMessageScrollerContext();
	const showsEnd = direction === "end";
	return (
		<Button
			type="button"
			data-slot="message-scroller-button"
			data-direction={direction}
			variant={variant}
			size={size}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (showsEnd) scrollToEnd();
				else scrollToStart();
			}}
			className={cn(
				"absolute inset-s-1/2 pointer-events-none -translate-x-1/2 scale-95 border-border bg-background text-foreground opacity-0 transition-[translate,scale,opacity] duration-200 hover:bg-muted hover:text-foreground rtl:translate-x-1/2",
				showsEnd
					? "bottom-4 translate-y-full group-data-[overflow-y-end]/message-scroller:pointer-events-auto group-data-[overflow-y-end]/message-scroller:translate-y-0 group-data-[overflow-y-end]/message-scroller:scale-100 group-data-[overflow-y-end]/message-scroller:opacity-100"
					: "top-4 -translate-y-full group-data-[overflow-y-start]/message-scroller:pointer-events-auto group-data-[overflow-y-start]/message-scroller:translate-y-0 group-data-[overflow-y-start]/message-scroller:scale-100 group-data-[overflow-y-start]/message-scroller:opacity-100 [&_svg]:rotate-180",
				className,
			)}
			{...props}
		>
			{children ?? (
				<>
					<ArrowDownIcon />
					<span className="sr-only">{showsEnd ? "Scroll to end" : "Scroll to start"}</span>
				</>
			)}
		</Button>
	);
}
