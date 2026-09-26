import { Radio as BaseRadio } from "@base-ui/react/radio";
import { choiceVariants } from "#/components/ui/variants/choice";
import { mergeClassName } from "#/components/ui/variants/class-name";

/** One option. Place it inside a `RadioGroup`. */
export function Radio({ className, ...props }: BaseRadio.Root.Props) {
	return (
		<BaseRadio.Root
			className={mergeClassName(className, (extra) =>
				choiceVariants({ shape: "round", class: extra }),
			)}
			{...props}
		>
			<BaseRadio.Indicator className="size-2 rounded-full bg-primary-fg" />
		</BaseRadio.Root>
	);
}
