import { mergeProps } from "@base-ui/react/merge-props";
import { Popover as BasePopover } from "@base-ui/react/popover";
import { useRender } from "@base-ui/react/use-render";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { POSITION_DEFAULTS, type PositionProps } from "#/components/ui/variants/positioning";
import { surfaceVariants } from "#/components/ui/variants/surface";
import { textVariants } from "#/components/ui/variants/text";

/* `extend` takes one parent, so the shared title and description classes are
 * called in rather than extended. */
const text = textVariants();

const popoverVariants = tv({
	extend: surfaceVariants,
	slots: {
		header: "flex flex-col gap-0.5",
		title: text.title({ class: "text-sm" }),
		description: text.description(),
	},
	defaultVariants: { density: "pad" },
});

const popoverSlots = popoverVariants();

/** Groups the popover's parts and holds its state. */
export const Root = BasePopover.Root;
/** Opens the popover. */
export const Trigger = BasePopover.Trigger;
/** Closes the popover. */
export const Close = BasePopover.Close;

/** The popover's panel, placed next to its trigger. */
export function Content({
	className,
	side = POSITION_DEFAULTS.side,
	sideOffset = POSITION_DEFAULTS.sideOffset,
	align = POSITION_DEFAULTS.align,
	alignOffset = POSITION_DEFAULTS.alignOffset,
	anchor,
	...props
}: BasePopover.Popup.Props & PositionProps) {
	return (
		<BasePopover.Portal>
			<BasePopover.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className={popoverSlots.positioner()}
			>
				<BasePopover.Popup
					className={mergeClassName(className, (extra) =>
						popoverSlots.popup({ class: ["flex w-72 flex-col gap-2.5", extra] }),
					)}
					{...props}
				/>
			</BasePopover.Positioner>
		</BasePopover.Portal>
	);
}

/** Stacks the popover's title and description. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: popoverSlots.header({ class: className }) }, props),
	});
}

/** The popover's title, which also names it for screen readers. */
export function Title({ className, ...props }: BasePopover.Title.Props) {
	return (
		<BasePopover.Title
			className={mergeClassName(className, (extra) => popoverSlots.title({ class: extra }))}
			{...props}
		/>
	);
}

/** The popover's supporting text. */
export function Description({ className, ...props }: BasePopover.Description.Props) {
	return (
		<BasePopover.Description
			className={mergeClassName(className, (extra) => popoverSlots.description({ class: extra }))}
			{...props}
		/>
	);
}
