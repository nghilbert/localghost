import { Select as BaseSelect } from "@base-ui/react/select";
import type { Separator as BaseSeparator } from "@base-ui/react/separator";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";
import { optionVariants } from "#/components/ui/variants/option";
import { POSITION_DEFAULTS, type PositionProps } from "#/components/ui/variants/positioning";
import { surfaceVariants } from "#/components/ui/variants/surface";

/*
 * `extend` takes one parent, so the panel classes are extended and the control
 * box is called instead to seed the trigger.
 *
 * Two things to know before editing. A `variants` block here can only name
 * slots declared here, not inherited ones. And redeclaring an inherited slot
 * puts these classes before the parent's variants, so anything that has to beat
 * a parent variant goes at the call site. See `Content`.
 */
const selectVariants = tv({
	extend: surfaceVariants,
	slots: {
		trigger: controlVariants({
			class:
				"w-fit justify-between gap-1.5 pr-2 pl-2.5 whitespace-nowrap select-none data-placeholder:text-muted-fg",
		}),
		icon: "text-muted-fg transition-transform",
		value: "flex flex-1 items-center gap-1.5 text-left line-clamp-1",
		scrollArrow: "sticky z-10 flex w-full items-center justify-center bg-surface py-1",
	},
	defaultVariants: { density: "list" },
});

const selectSlots = selectVariants();
const optionSlots = optionVariants();

/** Groups the select's parts and holds its state. */
export const Root = BaseSelect.Root;
/** Groups related items. */
export const Group = BaseSelect.Group;

/**
 * Opens the list. Drawn in the control box, with the chevron built in.
 *
 * Name it with a `Field.Label` or a `Select.Label` where there is one, and with
 * an `aria-label` otherwise.
 */
export function Trigger({ className, children, ...props }: BaseSelect.Trigger.Props) {
	return (
		<BaseSelect.Trigger
			className={mergeClassName(className, (extra) => selectSlots.trigger({ class: extra }))}
			{...props}
		>
			{children}
			{/* Base UI's Icon defaults to `children: "▼"`, so the render function replaces
			    the children rather than spreading them into the SVG. */}
			<BaseSelect.Icon
				render={(props, state) => (
					<span {...props} className={selectSlots.icon({ class: state.open && "rotate-180" })}>
						<ChevronDownIcon />
					</span>
				)}
			/>
		</BaseSelect.Trigger>
	);
}

/** Shows the selected item's label. */
export function Value({ className, ...props }: BaseSelect.Value.Props) {
	return (
		<BaseSelect.Value
			className={mergeClassName(className, (extra) => selectSlots.value({ class: extra }))}
			{...props}
		/>
	);
}

/**
 * The popup holding the items.
 *
 * By default it overlaps the trigger so the selected item sits on top of it, the
 * way a native select behaves. Pass `alignItemWithTrigger={false}` to drop it
 * below the trigger instead.
 */
export function Content({
	className,
	children,
	side = POSITION_DEFAULTS.side,
	sideOffset = POSITION_DEFAULTS.sideOffset,
	align = POSITION_DEFAULTS.align,
	alignOffset = POSITION_DEFAULTS.alignOffset,
	alignItemWithTrigger = true,
	...props
}: BaseSelect.Popup.Props &
	Omit<PositionProps, "anchor"> &
	Pick<BaseSelect.Positioner.Props, "alignItemWithTrigger">) {
	return (
		<BaseSelect.Portal>
			<BaseSelect.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				alignItemWithTrigger={alignItemWithTrigger}
				className={selectSlots.positioner()}
			>
				<BaseSelect.Popup
					className={mergeClassName(className, (extra) =>
						selectSlots.popup({ class: ["relative w-(--anchor-width) min-w-36", extra] }),
					)}
					{...props}
				>
					<BaseSelect.ScrollUpArrow className={selectSlots.scrollArrow({ class: "top-0" })}>
						<ChevronUpIcon />
					</BaseSelect.ScrollUpArrow>
					<BaseSelect.List>{children}</BaseSelect.List>
					<BaseSelect.ScrollDownArrow className={selectSlots.scrollArrow({ class: "bottom-0" })}>
						<ChevronDownIcon />
					</BaseSelect.ScrollDownArrow>
				</BaseSelect.Popup>
			</BaseSelect.Positioner>
		</BaseSelect.Portal>
	);
}

/** One item in the select. */
export function Item({ className, children, ...props }: BaseSelect.Item.Props) {
	return (
		<BaseSelect.Item
			className={mergeClassName(className, (extra) =>
				optionSlots.item({ indicator: true, class: extra }),
			)}
			{...props}
		>
			<BaseSelect.ItemText className="flex flex-1 items-center gap-2 whitespace-nowrap">
				{children}
			</BaseSelect.ItemText>
			<BaseSelect.ItemIndicator className={optionSlots.indicator()}>
				<CheckIcon />
			</BaseSelect.ItemIndicator>
		</BaseSelect.Item>
	);
}

/** Labels a group of items. */
export function GroupLabel({ className, ...props }: BaseSelect.GroupLabel.Props) {
	return (
		<BaseSelect.GroupLabel
			className={mergeClassName(className, (extra) => optionSlots.label({ class: extra }))}
			{...props}
		/>
	);
}

/** A line between groups of items. */
export function Separator({ className, ...props }: BaseSeparator.Props) {
	return (
		<BaseSelect.Separator
			className={mergeClassName(className, (extra) => optionSlots.separator({ class: extra }))}
			{...props}
		/>
	);
}
