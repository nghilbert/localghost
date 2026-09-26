import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** Holds `Toggle`s. Value is always an array, even without `multiple`. */
export function ToggleGroup({ className, ...props }: BaseToggleGroup.Props) {
	return (
		<BaseToggleGroup
			className={mergeClassName(className, (extra) => [
				"flex w-fit items-center gap-1 data-vertical:flex-col data-vertical:items-stretch",
				extra,
			])}
			{...props}
		/>
	);
}
