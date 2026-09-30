import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { FOCUS_RING } from "#/components/ui/variants/focus";

const scrollAreaVariants = tv({
	slots: {
		root: "relative min-h-0 overflow-hidden",
		viewport: ["size-full rounded-[inherit] outline-none", FOCUS_RING],
		scrollbar: [
			"flex touch-none p-px select-none",
			"transition-opacity duration-150 data-hovering:opacity-100 data-scrolling:opacity-100",
			"data-horizontal:h-2.5 data-horizontal:flex-col data-vertical:w-2.5",
		],
		thumb: "relative flex-1 rounded-full bg-line",
	},
});

const scrollAreaSlots = scrollAreaVariants();

/** Wraps the scrolled content. */
export const Content = BaseScrollArea.Content;
/** Fills the corner where the two scrollbars meet. */
export const Corner = BaseScrollArea.Corner;

/**
 * A scrolling region with its own scrollbars. Put a `Viewport` inside it, the
 * content inside that, and a `Scrollbar` beside the viewport.
 */
export function Root({ className, ...props }: BaseScrollArea.Root.Props) {
	return (
		<BaseScrollArea.Root
			className={mergeClassName(className, (extra) => scrollAreaSlots.root({ class: extra }))}
			{...props}
		/>
	);
}

/** The element that actually scrolls. Name it with `aria-label` when it holds a region. */
export function Viewport({ className, ...props }: BaseScrollArea.Viewport.Props) {
	return (
		<BaseScrollArea.Viewport
			className={mergeClassName(className, (extra) => scrollAreaSlots.viewport({ class: extra }))}
			{...props}
		/>
	);
}

/** A scrollbar with its thumb built in. Vertical unless `orientation="horizontal"`. */
export function Scrollbar({ className, ...props }: BaseScrollArea.Scrollbar.Props) {
	return (
		<BaseScrollArea.Scrollbar
			className={mergeClassName(className, (extra) => scrollAreaSlots.scrollbar({ class: extra }))}
			{...props}
		>
			<BaseScrollArea.Thumb className={scrollAreaSlots.thumb()} />
		</BaseScrollArea.Scrollbar>
	);
}
