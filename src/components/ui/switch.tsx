import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { DISABLED, FOCUS_RING, INVALID_RING } from "#/components/ui/variants/focus";

const switchVariants = tv({
	slots: {
		root: [
			"relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full",
			"border border-transparent transition-colors outline-none",
			/* Widens the tap area without changing the drawn size. */
			"after:absolute after:-inset-x-3 after:-inset-y-2",
			FOCUS_RING,
			INVALID_RING,
			DISABLED,
			"data-checked:bg-primary data-unchecked:bg-line data-disabled:cursor-not-allowed",
		],
		thumb: [
			"pointer-events-none block size-4 rounded-full bg-bg transition-transform",
			"data-checked:translate-x-[calc(100%-2px)] data-unchecked:translate-x-0",
		],
	},
});

const switchSlots = switchVariants();

/** An on and off toggle. */
export function Switch({ className, ...props }: BaseSwitch.Root.Props) {
	return (
		<BaseSwitch.Root
			className={mergeClassName(className, (extra) => switchSlots.root({ class: extra }))}
			{...props}
		>
			<BaseSwitch.Thumb className={switchSlots.thumb()} />
		</BaseSwitch.Root>
	);
}
