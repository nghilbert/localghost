import { ContextMenu as BaseContextMenu } from "@base-ui/react/context-menu";
import { Menu } from "#/components/ui/menu";

/**
 * A menu opened by right click. Only `Root` and `Trigger` are its own; the other
 * parts come from `Menu`.
 */
export const Root = BaseContextMenu.Root;
/** The area that opens the context menu on right click. */
export const Trigger = BaseContextMenu.Trigger;
/** The context menu's popup. */
export const Content = Menu.Content;
/** Groups related items. */
export const Group = Menu.Group;
/** Labels a group of items. */
export const GroupLabel = Menu.GroupLabel;
/** One item in the context menu. */
export const Item = Menu.Item;
/** A menu item that navigates. */
export const LinkItem = Menu.LinkItem;
/** A menu item that toggles on and off. */
export const CheckboxItem = Menu.CheckboxItem;
/** Groups radio items so one is selected. */
export const RadioGroup = Menu.RadioGroup;
/** One choice in a radio group. */
export const RadioItem = Menu.RadioItem;
/** Groups a submenu's parts. */
export const SubmenuRoot = Menu.SubmenuRoot;
/** An item that opens a submenu. */
export const SubmenuTrigger = Menu.SubmenuTrigger;
/** A line between groups of items. */
export const Separator = Menu.Separator;
/** Shows an item's keyboard shortcut. */
export const Shortcut = Menu.Shortcut;
