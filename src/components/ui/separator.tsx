import { Separator as BaseSeparator } from "@base-ui/react/separator";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** A dividing line. Pass `orientation="vertical"` to stand it on end. */
export function Separator({ className, ...props }: BaseSeparator.Props) {
	return (
		<BaseSeparator
			className={mergeClassName(className, (extra) => [
				"shrink-0 bg-line data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
				extra,
			])}
			{...props}
		/>
	);
}
