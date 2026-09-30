import { Progress as BaseProgress } from "@base-ui/react/progress";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";

const progressVariants = tv({
	slots: {
		root: "grid w-full grid-cols-[1fr_auto] gap-x-2 gap-y-1.5",
		label: "text-sm font-medium",
		value: "col-start-2 text-sm text-muted-fg tabular-nums",
		track: "relative col-span-full h-1.5 overflow-hidden rounded-full bg-muted",
		indicator: [
			"h-full rounded-full bg-primary transition-[width] duration-500",
			"data-indeterminate:w-1/3 data-indeterminate:animate-progress-indeterminate",
		],
	},
});

const progressSlots = progressVariants();

/** Pass `value={null}` while the amount of work is unknown, and it reads as indeterminate. */
export function Root({ className, ...props }: BaseProgress.Root.Props) {
	return (
		<BaseProgress.Root
			className={mergeClassName(className, (extra) => progressSlots.root({ class: extra }))}
			{...props}
		/>
	);
}

/** Labels the progress bar. */
export function Label({ className, ...props }: BaseProgress.Label.Props) {
	return (
		<BaseProgress.Label
			className={mergeClassName(className, (extra) => progressSlots.label({ class: extra }))}
			{...props}
		/>
	);
}

/** The progress as text. */
export function Value({ className, ...props }: BaseProgress.Value.Props) {
	return (
		<BaseProgress.Value
			className={mergeClassName(className, (extra) => progressSlots.value({ class: extra }))}
			{...props}
		/>
	);
}

/** The bar's background. */
export function Track({ className, ...props }: BaseProgress.Track.Props) {
	return (
		<BaseProgress.Track
			className={mergeClassName(className, (extra) => progressSlots.track({ class: extra }))}
			{...props}
		/>
	);
}

/** The filled part of the bar. */
export function Indicator({ className, ...props }: BaseProgress.Indicator.Props) {
	return (
		<BaseProgress.Indicator
			className={mergeClassName(className, (extra) => progressSlots.indicator({ class: extra }))}
			{...props}
		/>
	);
}
