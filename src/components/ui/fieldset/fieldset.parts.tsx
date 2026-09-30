import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { textVariants } from "#/components/ui/variants/text";

const textSlots = textVariants();

/** Groups related fields under one legend. */
export function Root({ className, ...props }: BaseFieldset.Root.Props) {
	return (
		<BaseFieldset.Root
			className={mergeClassName(className, (extra) => ["flex flex-col gap-4", extra])}
			{...props}
		/>
	);
}

/**
 * Names the fieldset. Renders a `<div>` rather than a `<legend>`, wired up for
 * you.
 *
 * To put a group inside a fieldset, combine them:
 * `<Fieldset.Root render={<RadioGroup />}>`.
 */
export function Legend({ className, ...props }: BaseFieldset.Legend.Props) {
	return (
		<BaseFieldset.Legend
			className={mergeClassName(className, (extra) => textSlots.title({ class: extra }))}
			{...props}
		/>
	);
}
