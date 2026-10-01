import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { DISABLED, FOCUS_RING } from "#/components/ui/variants/focus";

/*
 * `layout` describes shape rather than emphasis, so it is its own prop instead
 * of going through `color` and `variant`.
 *
 * Only `Root` takes it. It writes `data-layout`, and the classes below read it
 * back. Parts are siblings, so `Tab` never sees what `Root` was given; the
 * attribute is how it crosses. `variants.css` defines the variants used here.
 */
const tabsVariants = tv({
	slots: {
		root: "",
		list: [
			"relative inline-flex w-fit items-center text-muted-fg",
			"in-segmented:h-8 in-segmented:rounded-md in-segmented:bg-muted in-segmented:p-[3px]",
			"in-underline:h-9 in-underline:gap-1 in-underline:border-b in-underline:border-line",
		],
		tab: [
			"relative z-10 inline-flex h-full flex-1 items-center justify-center gap-1.5",
			"rounded-sm px-2.5 text-sm font-medium whitespace-nowrap",
			"transition-colors outline-none hover:text-fg data-active:text-fg",
			FOCUS_RING,
			DISABLED,
			"data-disabled:pointer-events-none",
			"in-underline:rounded-none",
		],
		indicator: [
			"absolute z-0 transition-all duration-200 ease-out",
			"in-segmented:top-(--active-tab-top) in-segmented:left-(--active-tab-left)",
			"in-segmented:h-(--active-tab-height) in-segmented:w-(--active-tab-width)",
			"in-segmented:rounded-sm in-segmented:bg-bg",
			"in-underline:bottom-[-1px] in-underline:left-(--active-tab-left)",
			"in-underline:h-0.5 in-underline:w-(--active-tab-width) in-underline:bg-fg",
		],
		panel: "outline-none",
	},
});

const tabsSlots = tabsVariants();

/** How the tab list is drawn. */
export type TabsLayout = "segmented" | "underline";

/** Takes `layout` and writes it as `data-layout` for the parts below. */
export function Root({
	className,
	layout = "segmented",
	...props
}: BaseTabs.Root.Props & { layout?: TabsLayout }) {
	return (
		<BaseTabs.Root
			data-layout={layout}
			className={mergeClassName(className, (extra) => tabsSlots.root({ class: extra }))}
			{...props}
		/>
	);
}

/** Holds the tabs, and draws the moving marker under the selected one. */
export function List({ className, children, ...props }: BaseTabs.List.Props) {
	return (
		<BaseTabs.List
			className={mergeClassName(className, (extra) => tabsSlots.list({ class: extra }))}
			{...props}
		>
			{children}
			<BaseTabs.Indicator className={tabsSlots.indicator()} />
		</BaseTabs.List>
	);
}

/** For a tab that navigates, pass `render={<Link to="/inbox" />}` and `nativeButton={false}`. */
export function Tab({ className, ...props }: BaseTabs.Tab.Props) {
	return (
		<BaseTabs.Tab
			className={mergeClassName(className, (extra) => tabsSlots.tab({ class: extra }))}
			{...props}
		/>
	);
}

/** The content shown for one tab. */
export function Panel({ className, ...props }: BaseTabs.Panel.Props) {
	return (
		<BaseTabs.Panel
			className={mergeClassName(className, (extra) => tabsSlots.panel({ class: extra }))}
			{...props}
		/>
	);
}
