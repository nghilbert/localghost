import { Collapsible as BaseCollapsible } from "@base-ui/react/collapsible";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** Groups the collapsible's parts and holds its state. */
export const Root = BaseCollapsible.Root;
/** Shows or hides the collapsible's panel. */
export const Trigger = BaseCollapsible.Trigger;

/**
 * The part that shows and hides. It animates its height open and closed, so
 * padding belongs on an element inside it rather than on the panel.
 */
export function Panel({ className, ...props }: BaseCollapsible.Panel.Props) {
	return (
		<BaseCollapsible.Panel
			className={mergeClassName(className, (extra) => [
				"h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-150 ease-out",
				"data-starting-style:h-0 data-ending-style:h-0",
				extra,
			])}
			{...props}
		/>
	);
}
