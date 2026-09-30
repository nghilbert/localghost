import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { POSITION_DEFAULTS, type PositionProps } from "#/components/ui/variants/positioning";
import { surfaceVariants } from "#/components/ui/variants/surface";

const tooltipSlots = surfaceVariants({ color: "inverted" });

/** Groups the tooltip's parts and holds its state. */
export const Root = BaseTooltip.Root;
/** The element the tooltip describes. */
export const Trigger = BaseTooltip.Trigger;

/** Lets tooltips share one open delay. Mount it once, in the root layout. */
export function Provider({ delay = 0, ...props }: BaseTooltip.Provider.Props) {
	return <BaseTooltip.Provider delay={delay} {...props} />;
}

/**
 * The floating label.
 *
 * A tooltip is visual only: touch and screen readers never reach it. Give the
 * trigger its own `aria-label` saying the same thing.
 */
export function Content({
	className,
	// Not the shared defaults: a tooltip sits above its trigger so it never covers
	// what the pointer is on, and far enough out to clear the focus ring.
	side = "top",
	sideOffset = 6,
	align = POSITION_DEFAULTS.align,
	alignOffset = POSITION_DEFAULTS.alignOffset,
	...props
}: BaseTooltip.Popup.Props & Omit<PositionProps, "anchor">) {
	return (
		<BaseTooltip.Portal>
			<BaseTooltip.Positioner
				side={side}
				sideOffset={sideOffset}
				align={align}
				alignOffset={alignOffset}
				className={tooltipSlots.positioner()}
			>
				<BaseTooltip.Popup
					className={mergeClassName(className, (extra) =>
						tooltipSlots.popup({ class: ["w-fit max-w-xs px-3 py-1.5 text-xs", extra] }),
					)}
					{...props}
				/>
			</BaseTooltip.Positioner>
		</BaseTooltip.Portal>
	);
}
