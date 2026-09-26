import { Slider as BaseSlider } from "@base-ui/react/slider";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { DISABLED, FOCUS_RING } from "#/components/ui/variants/focus";

const sliderVariants = tv({
	slots: {
		root: "data-horizontal:w-full data-vertical:h-full",
		control: [
			"relative flex w-full touch-none items-center py-1.5 select-none",
			"data-disabled:opacity-50",
			"data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
		],
		track: [
			"relative grow overflow-hidden rounded-full bg-muted",
			"data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1",
		],
		indicator: "bg-primary data-horizontal:h-full data-vertical:w-full",
		thumb: [
			"relative block size-3 rounded-full border border-primary bg-bg select-none",
			/* Widens the tap area without changing the drawn size. */
			"after:absolute after:-inset-2",
			FOCUS_RING,
			DISABLED,
			"data-disabled:pointer-events-none",
		],
	},
});

const sliderSlots = sliderVariants();

/**
 * A track with one handle per value. Pass an array for a range.
 *
 * Label it with a `Field.Label`. A range needs one name per handle, so give each
 * handle its own `aria-label` instead.
 */
export function Slider({ className, value, defaultValue, ...props }: BaseSlider.Root.Props) {
	const values = value ?? defaultValue ?? 0;
	const thumbIndexes = Array.from(
		{ length: Array.isArray(values) ? values.length : 1 },
		(_, index) => index,
	);

	return (
		<BaseSlider.Root
			value={value}
			defaultValue={defaultValue}
			thumbAlignment="edge"
			className={mergeClassName(className, (extra) => sliderSlots.root({ class: extra }))}
			{...props}
		>
			<BaseSlider.Control className={sliderSlots.control()}>
				<BaseSlider.Track className={sliderSlots.track()}>
					<BaseSlider.Indicator className={sliderSlots.indicator()} />
				</BaseSlider.Track>
				{thumbIndexes.map((index) => (
					<BaseSlider.Thumb key={index} index={index} className={sliderSlots.thumb()} />
				))}
			</BaseSlider.Control>
		</BaseSlider.Root>
	);
}
