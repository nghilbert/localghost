import type { Popover as BasePopover } from "@base-ui/react/popover";

/**
 * The five placement props every `Content` accepts.
 */
export type PositionProps = Pick<
	BasePopover.Positioner.Props,
	"side" | "sideOffset" | "align" | "alignOffset" | "anchor"
>;

/**
 * Where a panel sits unless a component says otherwise. Menus leave these unset
 * so Base UI can pick a side when they open.
 */
export const POSITION_DEFAULTS = {
	side: "bottom",
	sideOffset: 4,
	align: "center",
	alignOffset: 0,
} as const satisfies PositionProps;
