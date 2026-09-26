import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { mergeClassName } from "#/components/ui/variants/class-name";

/**
 * A set of `Radio` options where one can be chosen.
 *
 * The options do not name the group, so label it: a `Fieldset.Legend` inside a
 * `Field.Root`, or `aria-labelledby`.
 */
export function RadioGroup({ className, ...props }: BaseRadioGroup.Props) {
	return (
		<BaseRadioGroup
			className={mergeClassName(className, (extra) => ["grid w-full gap-2", extra])}
			{...props}
		/>
	);
}
