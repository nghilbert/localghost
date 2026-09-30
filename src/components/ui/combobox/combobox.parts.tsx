import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { cn, tv } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";
import { optionVariants } from "#/components/ui/variants/option";
import { POSITION_DEFAULTS, type PositionProps } from "#/components/ui/variants/positioning";
import { surfaceVariants } from "#/components/ui/variants/surface";

const comboboxVariants = tv({
	extend: surfaceVariants,
	slots: {
		inputGroup: controlVariants({ focus: "within", class: "pr-1" }),
		input: "h-full min-w-0 flex-1 bg-transparent px-2.5 outline-none placeholder:text-muted-fg",
		list: "max-h-72 scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
		/* Sticky, so it needs an opaque background of its own. */
		groupLabel: "sticky top-0 z-10 bg-surface px-2 py-1.5 text-xs text-muted-fg",
		empty: "py-2 text-center text-sm text-muted-fg empty:hidden",
	},
	/* `density: none` because `List` does its own padding and scrolling. */
	defaultVariants: { density: "none" },
});

const comboboxSlots = comboboxVariants();
const optionSlots = optionVariants();

/** Groups the combobox's parts and holds its state. */
export const Root = BaseCombobox.Root;
/** Shows the selected value. */
export const Value = BaseCombobox.Value;
/** Renders one child per entry in `items`. */
export const Collection = BaseCombobox.Collection;
/** Base UI's matcher for filtering items by the input text. */
export const useFilter = BaseCombobox.useFilter;

/**
 * The text input with its trigger and clear buttons, inside Base UI's `InputGroup`
 * drawn as the control box.
 *
 * `className` and `ref` both land on the `<input>`. The box drawn around it is a
 * separate element with its own prop, so `groupClassName="w-48"` sizes the box
 * and `className` styles the text field inside it.
 *
 * Label it with a `Field.Label` or a plain `<label>`. `Combobox.Label` names the
 * trigger instead, for when the input lives inside the panel.
 */
export function Input({
	className,
	groupClassName,
	showTrigger = true,
	showClear = false,
	...props
}: BaseCombobox.Input.Props & {
	groupClassName?: string;
	showTrigger?: boolean;
	showClear?: boolean;
}) {
	return (
		<BaseCombobox.InputGroup className={comboboxSlots.inputGroup({ class: groupClassName })}>
			<BaseCombobox.Input
				className={mergeClassName(className, (extra) => comboboxSlots.input({ class: extra }))}
				{...props}
			/>
			{showClear && (
				<BaseCombobox.Clear
					aria-label="Clear"
					render={<Button variant="quiet" size="sm" iconOnly />}
				>
					<XIcon />
				</BaseCombobox.Clear>
			)}
			{showTrigger && (
				<BaseCombobox.Trigger
					aria-label="Open"
					render={(props, state) => (
						<Button {...props} color="primary" variant="quiet" size="sm" iconOnly>
							<ChevronDownIcon
								className={cn("text-muted-fg transition-transform", state.open && "rotate-180")}
							/>
						</Button>
					)}
				/>
			)}
		</BaseCombobox.InputGroup>
	);
}

/** The panel of filtered options, drawn as wide as the input. */
export function Content({
	className,
	side = POSITION_DEFAULTS.side,
	// Not the shared default: the panel hangs from the input's left edge, far
	// enough out to clear its focus ring.
	sideOffset = 6,
	align = "start",
	alignOffset = POSITION_DEFAULTS.alignOffset,
	anchor,
	...props
}: BaseCombobox.Popup.Props & PositionProps) {
	return (
		<BaseCombobox.Portal>
			<BaseCombobox.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				className={comboboxSlots.positioner()}
			>
				<BaseCombobox.Popup
					className={mergeClassName(className, (extra) =>
						comboboxSlots.popup({
							class: [
								"max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) overflow-hidden",
								extra,
							],
						}),
					)}
					{...props}
				/>
			</BaseCombobox.Positioner>
		</BaseCombobox.Portal>
	);
}

/** The scrolling list of options. */
export function List({ className, ...props }: BaseCombobox.List.Props) {
	return (
		<BaseCombobox.List
			className={mergeClassName(className, (extra) => comboboxSlots.list({ class: extra }))}
			{...props}
		/>
	);
}

/** One item in the combobox. */
export function Item({ className, children, ...props }: BaseCombobox.Item.Props) {
	return (
		<BaseCombobox.Item
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ indicator: true, class: extra }),
			)}
			{...props}
		>
			{children}
			<BaseCombobox.ItemIndicator className={optionSlots.indicator()}>
				<CheckIcon />
			</BaseCombobox.ItemIndicator>
		</BaseCombobox.Item>
	);
}

/** Groups related items. */
export const Group = BaseCombobox.Group;

/** Labels a group of items. */
export function GroupLabel({ className, ...props }: BaseCombobox.GroupLabel.Props) {
	return (
		<BaseCombobox.GroupLabel
			className={mergeClassName(className, (extra) => comboboxSlots.groupLabel({ class: extra }))}
			{...props}
		/>
	);
}

/** Shown only while the filtered list has nothing in it. */
export function Empty({ className, ...props }: BaseCombobox.Empty.Props) {
	return (
		<BaseCombobox.Empty
			className={mergeClassName(className, (extra) => comboboxSlots.empty({ class: extra }))}
			{...props}
		/>
	);
}

/** A line between groups of items. */
export function Separator({ className, ...props }: BaseCombobox.Separator.Props) {
	return (
		<BaseCombobox.Separator
			className={mergeClassName(className, (extra) => optionSlots.separator({ class: extra }))}
			{...props}
		/>
	);
}
