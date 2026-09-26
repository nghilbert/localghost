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
import { cn, tv } from "tailwind-variants";
import { Button, type ButtonProps } from "#/components/ui/button";
import { ScrollArea } from "#/components/ui/scroll-area";
import { mergeClassName } from "#/components/ui/variants/class-name";

const messageScrollerVariants = tv({
	slots: {
		root: "group/message-scroller relative flex size-full min-h-0 flex-col overflow-hidden",
		scrollbar: "opacity-0",
		viewport: "size-full min-h-0 min-w-0 scroll-fade-b overscroll-contain contain-content",
		content: "flex h-max min-h-full flex-col gap-6",
		item: "min-w-0 shrink-0 [contain-intrinsic-size:auto_10rem] [content-visibility:auto]",
		button: [
			"pointer-events-none absolute left-1/2 -translate-x-1/2 scale-95 bg-bg opacity-0",
			"transition-[translate,scale,opacity] duration-200 rtl:translate-x-1/2",
		],
	},
	variants: {
		/** Which end of the transcript the button scrolls to. It shows once that end is out of view. */
		direction: {
			end: {
				button: [
					"bottom-4 translate-y-full",
					"group-data-overflow-y-end/message-scroller:pointer-events-auto group-data-overflow-y-end/message-scroller:translate-y-0",
					"group-data-overflow-y-end/message-scroller:scale-100 group-data-overflow-y-end/message-scroller:opacity-100",
				],
			},
			start: {
				button: [
					"top-4 -translate-y-full [&_svg]:rotate-180",
					"group-data-overflow-y-start/message-scroller:pointer-events-auto group-data-overflow-y-start/message-scroller:translate-y-0",
					"group-data-overflow-y-start/message-scroller:scale-100 group-data-overflow-y-start/message-scroller:opacity-100",
				],
			},
		},
	},
	defaultVariants: { direction: "end" },
});

const messageScrollerSlots = messageScrollerVariants();

type DefaultScrollPosition = "start" | "end" | "last-anchor";
type ButtonDirection = "start" | "end";

/** Distance from an edge (px) still treated as being at that edge. */
const EDGE_THRESHOLD = 24;

function scrollElementToBottom({
	viewport,
	behavior,
}: {
	viewport: HTMLDivElement;
	behavior: ScrollBehavior;
}) {
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
	const context = use(MessageScrollerContext);
	if (!context) {
		throw new Error("MessageScroller components must be used within <MessageScrollerProvider>");
	}
	return context;
}

/**
 * Scrolls a transcript: follows new content while the user is at the bottom
 * (`autoScroll`) and brings each new turn to the top (`last-anchor`).
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

	// Shared through context for the scrollbar drag and the scroll buttons.
	const markUserIntent = () => {
		userIntentRef.current = true;
	};

	const scrollToEnd = (behavior: ScrollBehavior = "smooth") => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		pinRef.current = "bottom";
		scrollElementToBottom({ viewport, behavior });
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

		// A spacer lets the last turn scroll to the top even when it is shorter than the viewport.
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
			else if (pinRef.current === "bottom") scrollElementToBottom({ viewport, behavior });
		};

		const markIntent = () => {
			userIntentRef.current = true;
		};

		// Only the user's own scrolling changes what the view follows.
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

			// A new turn scrolls to the top.
			if (anchorCount > anchorCountRef.current) {
				anchorCountRef.current = anchorCount;
				pinRef.current = "anchor";
				applyPin("smooth");
				return;
			}

			// Content grew while streaming; follow the bottom only when `autoScroll` is on.
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
		<MessageScrollerContext
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
		</MessageScrollerContext>
	);
}

/** The scroll area around a transcript. Mount it inside a `MessageScrollerProvider`. */
export function MessageScroller({
	className,
	children,
	...props
}: ComponentProps<typeof ScrollArea.Root>) {
	const { markUserIntent } = useMessageScrollerContext();
	return (
		<ScrollArea.Root
			overflowEdgeThreshold={EDGE_THRESHOLD}
			className={mergeClassName(className, (extra) => messageScrollerSlots.root({ class: extra }))}
			{...props}
		>
			{children}
			<ScrollArea.Scrollbar
				onPointerDown={markUserIntent}
				className={messageScrollerSlots.scrollbar()}
			/>
			<ScrollArea.Corner />
		</ScrollArea.Root>
	);
}

/** The element that scrolls. Name it with `aria-label`, such as "Conversation". */
export function MessageScrollerViewport({
	className,
	...props
}: ComponentProps<typeof ScrollArea.Viewport>) {
	const { viewportRef } = useMessageScrollerContext();
	return (
		<ScrollArea.Viewport
			ref={viewportRef}
			className={mergeClassName(className, (extra) =>
				messageScrollerSlots.viewport({ class: extra }),
			)}
			{...props}
		/>
	);
}

/** Holds the items, plus the spacer that lets the last anchor reach the top. */
export function MessageScrollerContent({
	className,
	children,
	...props
}: ComponentProps<typeof ScrollArea.Content>) {
	const { contentRef, spacerRef } = useMessageScrollerContext();
	return (
		<ScrollArea.Content
			ref={contentRef}
			className={mergeClassName(className, (extra) =>
				messageScrollerSlots.content({ class: extra }),
			)}
			{...props}
		>
			{children}
			<div ref={spacerRef} aria-hidden />
		</ScrollArea.Content>
	);
}

/**
 * One entry in the transcript. A `scrollAnchor` item snaps to the top when it is
 * appended, which is how a new turn comes into view.
 */
export function MessageScrollerItem({
	className,
	scrollAnchor = false,
	messageId,
	...props
}: ComponentProps<"div"> & { scrollAnchor?: boolean; messageId?: string }) {
	return (
		<div
			data-message-id={messageId}
			data-scroll-anchor={scrollAnchor ? "" : undefined}
			className={cn(messageScrollerSlots.item(), className)}
			{...props}
		/>
	);
}

/**
 * Scrolls to one end of the transcript. It stays hidden until that end is out of
 * view, and is named "Scroll to end" or "Scroll to start".
 */
export function MessageScrollerButton({
	direction = "end",
	className,
	children,
	onClick,
	...props
}: ButtonProps & { direction?: ButtonDirection }) {
	const { scrollToEnd, scrollToStart } = useMessageScrollerContext();
	const showsEnd = direction === "end";
	return (
		<Button
			type="button"
			color="neutral"
			variant="outlined"
			size="sm"
			iconOnly
			aria-label={showsEnd ? "Scroll to end" : "Scroll to start"}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				if (showsEnd) scrollToEnd();
				else scrollToStart();
			}}
			className={mergeClassName(className, (extra) =>
				messageScrollerSlots.button({ direction, class: extra }),
			)}
			{...props}
		>
			{children ?? <ArrowDownIcon />}
		</Button>
	);
}
