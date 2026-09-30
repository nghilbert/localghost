import { LoaderCircleIcon, LoaderIcon, LoaderPinwheelIcon, type LucideProps } from "lucide-react";
import { tv, type VariantProps } from "tailwind-variants";

const ICONS = {
	default: LoaderIcon,
	circle: LoaderCircleIcon,
	pinwheel: LoaderPinwheelIcon,
} as const;

const spinnerVariants = tv({
	base: "animate-spin",
	variants: {
		/** Which loader to draw. Called `icon`, since `variant` means emphasis everywhere else. */
		icon: { default: "", circle: "", pinwheel: "" },
		size: {
			sm: "[--icon-size:--spacing(3.5)]",
			md: "[--icon-size:--spacing(4)]",
			lg: "[--icon-size:--spacing(6)]",
		},
	},
	defaultVariants: { icon: "default", size: "md" },
});

/** Props for {@link Spinner}. `size` replaces Lucide's own, which it renders as a `width` attribute. */
export type SpinnerProps = Omit<LucideProps, "size"> &
	VariantProps<typeof spinnerVariants> & {
		/**
		 * Announce the wait to screen readers. Leave it off when something else
		 * already says the page is busy, such as the label of the button it sits in.
		 */
		label?: string;
	};

/** An animated loading indicator. Pass `label` to announce it. */
export function Spinner({ className, icon = "default", size, label, ...props }: SpinnerProps) {
	const Icon = ICONS[icon];
	const glyph = (
		<Icon aria-hidden className={spinnerVariants({ icon, size, class: className })} {...props} />
	);

	if (!label) return glyph;

	// `role="status"` has to wrap text, not an icon. `contents` keeps the extra
	// span out of the layout.
	return (
		<span role="status" className="contents">
			{glyph}
			<span className="sr-only">{label}</span>
		</span>
	);
}
