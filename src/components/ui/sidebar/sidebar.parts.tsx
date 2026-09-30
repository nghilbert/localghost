import { Button as BaseButton } from "@base-ui/react/button";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { PanelLeftIcon } from "lucide-react";
import {
	type ComponentProps,
	type CSSProperties,
	createContext,
	use,
	useEffect,
	useEffectEvent,
	useState,
} from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Button, type ButtonProps } from "#/components/ui/button";
import { type InputProps, Input as InputUi } from "#/components/ui/input";
import { Separator as SeparatorUi } from "#/components/ui/separator";
import { Sheet } from "#/components/ui/sheet";
import { Tooltip } from "#/components/ui/tooltip";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { FOCUS_RING } from "#/components/ui/variants/focus";
import { useIsMobile } from "./use-is-mobile";

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/*
 * `Root` draws the panel from its own props and the open state, so its slots
 * take variants directly. Parts inside it read the collapsed state back from
 * the `data-collapsible` attribute `Root` writes (`in-sidebar-icon` in
 * `base.css`), which callers can use too.
 */
const sidebarVariants = tv({
	slots: {
		provider: "flex min-h-svh w-full",
		static: "flex h-full w-(--sidebar-width) flex-col bg-surface text-surface-fg",
		root: "hidden text-surface-fg md:block",
		gap: "relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
		container:
			"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
		inner: "flex size-full flex-col bg-surface",
		mobile: "w-(--sidebar-width) gap-0 p-0",
		rail: [
			"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear sm:flex",
			"after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-line",
		],
		inset: "relative flex w-full flex-1 flex-col bg-bg",
		input: "h-8 w-full bg-bg",
		header: "flex flex-col gap-2 p-2",
		footer: "flex flex-col gap-2 p-2",
		separator: "mx-2 w-auto",
		content: "flex min-h-0 flex-1 flex-col overflow-auto in-sidebar-icon:overflow-hidden",
		group: "relative flex w-full min-w-0 flex-col p-2",
		groupLabel: [
			"flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-muted-fg",
			"transition-[margin,opacity] duration-200 ease-linear",
			"in-sidebar-icon:-mt-8 in-sidebar-icon:opacity-0 [--icon-size:--spacing(4)]",
		],
		groupContent: "w-full text-sm",
		menu: "flex w-full min-w-0 flex-col",
		menuItem: "group/menu-item relative",
		menuButton: [
			"flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
			"transition-[width,height,padding] hover:bg-neutral-soft active:bg-neutral-soft",
			FOCUS_RING,
			"disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
			"data-active:bg-primary-soft data-active:font-medium data-active:text-primary",
			"group-has-data-action/menu-item:pr-8 [&>span:last-child]:truncate [--icon-size:--spacing(4)]",
			"in-sidebar-icon:size-8! in-sidebar-icon:p-2!",
		],
		menuAction: [
			"absolute top-1/2 right-1 flex aspect-square w-5 -translate-y-1/2 items-center justify-center rounded-md p-0",
			"outline-hidden hover:bg-neutral-soft [--icon-size:--spacing(4)]",
			FOCUS_RING,
			"after:absolute after:-inset-2 md:after:hidden in-sidebar-icon:hidden",
		],
		menuBadge: [
			"pointer-events-none absolute top-1/2 right-1 flex h-5 min-w-5 -translate-y-1/2 items-center justify-center",
			"rounded-md px-1 text-xs font-medium tabular-nums select-none in-sidebar-icon:hidden",
		],
	},
	variants: {
		side: {
			left: { container: "left-0", rail: "-right-4" },
			right: { container: "right-0", rail: "left-0" },
		},
		/** `floating` draws the panel as a card inset from the screen edge. */
		variant: {
			sidebar: {},
			floating: { container: "p-2", inner: "rounded-lg shadow-sm ring-1 ring-line" },
		},
		/** How the panel is collapsed right now; `none` while it is open. */
		collapsed: {
			none: {},
			offcanvas: { gap: "w-0" },
			icon: { gap: "w-(--sidebar-width-icon)", container: "w-(--sidebar-width-icon)" },
		},
		size: {
			sm: { menuButton: "h-7 text-xs" },
			md: { menuButton: "h-8" },
			lg: { menuButton: "h-12 in-sidebar-icon:p-0!" },
		},
		/** How loud to draw a menu button at rest. */
		emphasis: {
			quiet: {},
			outlined: { menuButton: "bg-bg ring-1 ring-line" },
		},
		showOnHover: {
			true: {
				menuAction:
					"group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 aria-expanded:opacity-100 md:opacity-0",
			},
			false: {},
		},
	},
	compoundVariants: [
		{ side: "left", variant: "sidebar", class: { container: "border-r border-line" } },
		{ side: "right", variant: "sidebar", class: { container: "border-l border-line" } },
		{ side: "left", collapsed: "offcanvas", class: { container: "-left-(--sidebar-width)" } },
		{ side: "right", collapsed: "offcanvas", class: { container: "-right-(--sidebar-width)" } },
		{
			variant: "floating",
			collapsed: "icon",
			class: {
				gap: "w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]",
				container: "w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
			},
		},
	],
	defaultVariants: {
		side: "left",
		variant: "sidebar",
		collapsed: "none",
		size: "md",
		emphasis: "quiet",
		showOnHover: false,
	},
});

const sidebarSlots = sidebarVariants();

type SidebarVariants = VariantProps<typeof sidebarVariants>;

type SidebarContextValue = {
	state: "expanded" | "collapsed";
	open: boolean;
	setOpen: (open: boolean) => void;
	openMobile: boolean;
	setOpenMobile: (open: boolean) => void;
	isMobile: boolean;
	toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

/** The sidebar's open state and its toggles. Call it inside a `Provider`. */
export function useSidebar(): SidebarContextValue {
	const context = use(SidebarContext);
	if (!context) throw new Error("useSidebar must be used within a Sidebar.Provider.");
	return context;
}

type ProviderProps = ComponentProps<"div"> & {
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

/**
 * Holds the open state for a `Root` and the `Inset` beside it, and lays the two
 * out side by side. Ctrl or Cmd plus B toggles it. Pass `open` and
 * `onOpenChange` to control it.
 */
export function Provider({
	defaultOpen = true,
	open: openProp,
	onOpenChange,
	className,
	style,
	children,
	...props
}: ProviderProps) {
	const isMobile = useIsMobile();
	const [openMobile, setOpenMobile] = useState(false);
	const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
	const open = openProp ?? uncontrolledOpen;

	const setOpen = (value: boolean) => {
		if (onOpenChange) onOpenChange(value);
		else setUncontrolledOpen(value);
	};

	const toggleSidebar = () => {
		if (isMobile) setOpenMobile(!openMobile);
		else setOpen(!open);
	};

	const onShortcut = useEffectEvent((event: KeyboardEvent) => {
		if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			toggleSidebar();
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", onShortcut);
		return () => window.removeEventListener("keydown", onShortcut);
	}, []);

	const providerStyle: CSSProperties & {
		"--sidebar-width": string;
		"--sidebar-width-icon": string;
	} = {
		"--sidebar-width": SIDEBAR_WIDTH,
		"--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
		...style,
	};

	return (
		<SidebarContext
			value={{
				state: open ? "expanded" : "collapsed",
				open,
				setOpen,
				openMobile,
				setOpenMobile,
				isMobile,
				toggleSidebar,
			}}
		>
			<div style={providerStyle} className={sidebarSlots.provider({ class: className })} {...props}>
				{children}
			</div>
		</SidebarContext>
	);
}

type RootProps = ComponentProps<"div"> &
	Pick<SidebarVariants, "side" | "variant"> & {
		/** What collapsing does: slide away, shrink to icons, or nothing. */
		collapsible?: "offcanvas" | "icon" | "none";
	};

/**
 * The panel. On a narrow screen it becomes a sheet that slides in from `side`.
 */
export function Root({
	side = "left",
	variant = "sidebar",
	collapsible = "offcanvas",
	className,
	children,
	...props
}: RootProps) {
	const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

	if (collapsible === "none") {
		return (
			<div className={sidebarSlots.static({ class: className })} {...props}>
				{children}
			</div>
		);
	}

	if (isMobile) {
		const mobileStyle: CSSProperties & { "--sidebar-width": string } = {
			"--sidebar-width": SIDEBAR_WIDTH_MOBILE,
		};
		return (
			<Sheet.Root open={openMobile} onOpenChange={setOpenMobile}>
				<Sheet.Content
					side={side}
					showCloseButton={false}
					className={sidebarSlots.mobile({ class: className })}
					style={mobileStyle}
				>
					<Sheet.Header className="sr-only">
						<Sheet.Title>Sidebar</Sheet.Title>
						<Sheet.Description>Displays the mobile sidebar.</Sheet.Description>
					</Sheet.Header>
					<div className="flex h-full w-full flex-col">{children}</div>
				</Sheet.Content>
			</Sheet.Root>
		);
	}

	const collapsed = state === "collapsed" ? collapsible : "none";

	return (
		<div
			className={sidebarSlots.root()}
			data-state={state}
			data-collapsible={state === "collapsed" ? collapsible : undefined}
			data-variant={variant}
			data-sidebar-side={side}
		>
			<div className={sidebarSlots.gap({ variant, collapsed })} />
			<div
				className={sidebarSlots.container({ side, variant, collapsed, class: className })}
				{...props}
			>
				<div className={sidebarSlots.inner({ variant })}>{children}</div>
			</div>
		</div>
	);
}

/** Opens and closes the sidebar. Named "Toggle sidebar" unless you pass `aria-label`. */
export function Trigger({ onClick, children, ...props }: ButtonProps) {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			color="neutral"
			variant="quiet"
			size="sm"
			iconOnly
			aria-label="Toggle sidebar"
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			{children ?? <PanelLeftIcon />}
		</Button>
	);
}

/** A thin strip along the panel's edge that toggles it on click. Out of the tab order. */
export function Rail({
	className,
	side = "left",
	...props
}: BaseButton.Props & Pick<SidebarVariants, "side">) {
	const { toggleSidebar } = useSidebar();

	return (
		<BaseButton
			aria-label="Toggle sidebar"
			tabIndex={-1}
			onClick={toggleSidebar}
			className={mergeClassName(className, (extra) => sidebarSlots.rail({ side, class: extra }))}
			{...props}
		/>
	);
}

/** The page beside the sidebar, as the document's `<main>`. */
export function Inset({ render, className, ...props }: useRender.ComponentProps<"main">) {
	return useRender({
		defaultTagName: "main",
		render,
		props: mergeProps<"main">({ className: sidebarSlots.inset({ class: className }) }, props),
	});
}

/** A search input sized for the sidebar. */
export function Input({ className, ...props }: InputProps) {
	return (
		<InputUi
			className={mergeClassName(className, (extra) => sidebarSlots.input({ class: extra }))}
			{...props}
		/>
	);
}

/** The sidebar's top section. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.header({ class: className }) }, props),
	});
}

/** The sidebar's bottom section. */
export function Footer({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.footer({ class: className }) }, props),
	});
}

/** A line between sidebar sections. */
export function Separator({ className, ...props }: ComponentProps<typeof SeparatorUi>) {
	return (
		<SeparatorUi
			className={mergeClassName(className, (extra) => sidebarSlots.separator({ class: extra }))}
			{...props}
		/>
	);
}

/** The scrolling middle of the panel, between `Header` and `Footer`. */
export function Content({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.content({ class: className }) }, props),
	});
}

/** A section of related sidebar items. */
export function Group({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.group({ class: className }) }, props),
	});
}

/** Names a `Group`. It fades out while the panel is collapsed to icons. */
export function GroupLabel({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.groupLabel({ class: className }) }, props),
	});
}

/** Holds a group's items. */
export function GroupContent({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.groupContent({ class: className }) }, props),
	});
}

/** A list of sidebar menu items. */
export function Menu({ render, className, ...props }: useRender.ComponentProps<"ul">) {
	return useRender({
		defaultTagName: "ul",
		render,
		props: mergeProps<"ul">({ className: sidebarSlots.menu({ class: className }) }, props),
	});
}

/** One row of a `Menu`: a `MenuButton`, plus an optional `MenuAction` or `MenuBadge`. */
export function MenuItem({ render, className, ...props }: useRender.ComponentProps<"li">) {
	return useRender({
		defaultTagName: "li",
		render,
		props: mergeProps<"li">({ className: sidebarSlots.menuItem({ class: className }) }, props),
	});
}

type MenuButtonProps = useRender.ComponentProps<"button"> &
	Pick<SidebarVariants, "size"> & {
		/** Marks the row for the current page, as `data-active`. */
		active?: boolean;
		/** How loud to draw the row at rest. */
		variant?: "quiet" | "outlined";
		/** Shown beside the button while the panel is collapsed to icons. */
		tooltip?: string;
	};

/**
 * A row's main button. For a row that navigates, pass `render={<Link />}`.
 * With `tooltip`, the label stays reachable while the panel shows only icons.
 */
export function MenuButton({
	render,
	className,
	active = false,
	variant = "quiet",
	size = "md",
	tooltip,
	...props
}: MenuButtonProps) {
	const { isMobile, state } = useSidebar();
	const button = useRender({
		defaultTagName: "button",
		render: tooltip ? <Tooltip.Trigger render={render} /> : render,
		state: { active, size },
		props: mergeProps<"button">(
			{
				className: sidebarSlots.menuButton({ size, emphasis: variant, class: className }),
			},
			props,
		),
	});

	if (!tooltip) return button;

	return (
		<Tooltip.Root disabled={state !== "collapsed" || isMobile}>
			{button}
			<Tooltip.Content side="right">{tooltip}</Tooltip.Content>
		</Tooltip.Root>
	);
}

/** A small button at the end of a row. `showOnHover` hides it until the row is hovered. */
export function MenuAction({
	render,
	className,
	showOnHover = false,
	...props
}: useRender.ComponentProps<"button"> & { showOnHover?: boolean }) {
	return useRender({
		defaultTagName: "button",
		render,
		state: { action: true },
		props: mergeProps<"button">(
			{
				type: "button",
				className: sidebarSlots.menuAction({ showOnHover, class: className }),
			},
			props,
		),
	});
}

/** A count at the end of a row, such as unread items. */
export function MenuBadge({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sidebarSlots.menuBadge({ class: className }) }, props),
	});
}
