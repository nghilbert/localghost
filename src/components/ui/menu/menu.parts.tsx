import { Menu as BaseMenu } from "@base-ui/react/menu";
import { mergeProps } from "@base-ui/react/merge-props";
import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { useRender } from "@base-ui/react/use-render";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { optionVariants } from "#/components/ui/variants/option";
import type { PositionProps } from "#/components/ui/variants/positioning";
import { surfaceVariants } from "#/components/ui/variants/surface";

/* A menu is a floating panel that always holds a list. */
const menuVariants = tv({
	extend: surfaceVariants,
	defaultVariants: { density: "list" },
});

const menuSlots = menuVariants();
const optionSlots = optionVariants();

type ItemVariants = Pick<VariantProps<typeof optionVariants>, "color" | "inset">;

/** Groups the menu's parts and holds its state. */
export const Root = BaseMenu.Root;
/** Opens the menu. */
export const Trigger = BaseMenu.Trigger;
/** Renders the menu into `document.body`. */
export const Portal = BaseMenu.Portal;
/** Groups related items. */
export const Group = BaseMenu.Group;
/** Groups radio items so one is selected. */
export const RadioGroup = BaseMenu.RadioGroup;
/** Groups a submenu's parts. */
export const SubmenuRoot = BaseMenu.SubmenuRoot;

/**
 * The panel holding the items. Use it inside `SubmenuRoot` for a submenu too.
 *
 * Placement is left to Base UI: below a dropdown trigger, beside the parent item
 * for a submenu, at the pointer for a context menu. Pass `side`, `align` or
 * `sideOffset` to override it.
 */
export function Content({
	className,
	side,
	sideOffset,
	align,
	alignOffset,
	anchor,
	...props
}: BaseMenu.Popup.Props & PositionProps) {
	return (
		<BaseMenu.Portal>
			<BaseMenu.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className={menuSlots.positioner()}
			>
				<BaseMenu.Popup
					className={mergeClassName(className, (extra) => menuSlots.popup({ class: extra }))}
					{...props}
				/>
			</BaseMenu.Positioner>
		</BaseMenu.Portal>
	);
}

/** One item in the menu. */
export function Item({ className, color, inset, ...props }: BaseMenu.Item.Props & ItemVariants) {
	return (
		<BaseMenu.Item
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ color, inset, class: extra }),
			)}
			{...props}
		/>
	);
}

/**
 * A menu item that navigates. Pass the router's Link as `render`. It closes the menu on
 * click, since client-side navigation keeps the menu mounted.
 */
export function LinkItem({
	className,
	color,
	inset,
	closeOnClick = true,
	...props
}: BaseMenu.LinkItem.Props & ItemVariants) {
	return (
		<BaseMenu.LinkItem
			closeOnClick={closeOnClick}
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ color, inset, class: extra }),
			)}
			{...props}
		/>
	);
}

/** An item that opens a submenu. */
export function SubmenuTrigger({
	className,
	inset,
	children,
	...props
}: BaseMenu.SubmenuTrigger.Props & Pick<ItemVariants, "inset">) {
	return (
		<BaseMenu.SubmenuTrigger
			className={mergeClassName(className, (extra) => optionSlots.item({ inset, class: extra }))}
			{...props}
		>
			{children}
			<ChevronRightIcon className="ml-auto" />
		</BaseMenu.SubmenuTrigger>
	);
}

/** A menu item that toggles on and off. */
export function CheckboxItem({
	className,
	children,
	inset,
	...props
}: BaseMenu.CheckboxItem.Props & Pick<ItemVariants, "inset">) {
	return (
		<BaseMenu.CheckboxItem
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ inset, indicator: true, class: extra }),
			)}
			{...props}
		>
			{children}
			<BaseMenu.CheckboxItemIndicator className={optionSlots.indicator()}>
				<CheckIcon />
			</BaseMenu.CheckboxItemIndicator>
		</BaseMenu.CheckboxItem>
	);
}

/** One choice in a radio group. */
export function RadioItem({
	className,
	children,
	inset,
	...props
}: BaseMenu.RadioItem.Props & Pick<ItemVariants, "inset">) {
	return (
		<BaseMenu.RadioItem
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ inset, indicator: true, class: extra }),
			)}
			{...props}
		>
			{children}
			<BaseMenu.RadioItemIndicator className={optionSlots.indicator()}>
				<CheckIcon />
			</BaseMenu.RadioItemIndicator>
		</BaseMenu.RadioItem>
	);
}

/** Names a group of items. Pass `inset` to line it up with items that carry an icon. */
export function GroupLabel({
	className,
	inset,
	...props
}: BaseMenu.GroupLabel.Props & Pick<ItemVariants, "inset">) {
	return (
		<BaseMenu.GroupLabel
			className={mergeClassName(className, (extra) => optionSlots.label({ inset, class: extra }))}
			{...props}
		/>
	);
}

/** A line between groups of items. */
export function Separator({ className, ...props }: BaseSeparator.Props) {
	return (
		<BaseSeparator
			className={mergeClassName(className, (extra) => optionSlots.separator({ class: extra }))}
			{...props}
		/>
	);
}

/** A keyboard hint, pushed to the right of an `Item`. */
export function Shortcut({ render, className, ...props }: useRender.ComponentProps<"span">) {
	return useRender({
		defaultTagName: "span",
		render,
		props: mergeProps<"span">({ className: optionSlots.shortcut({ class: className }) }, props),
	});
}
