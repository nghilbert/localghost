import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { tv, type VariantProps } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";

const avatarVariants = tv({
	slots: {
		root: "relative flex shrink-0 overflow-hidden rounded-full bg-muted select-none",
		image: "aspect-square size-full object-cover",
		fallback: "flex size-full items-center justify-center font-medium text-muted-fg",
	},
	variants: {
		size: {
			sm: { root: "size-6 text-xs" },
			md: { root: "size-8 text-sm" },
			lg: { root: "size-10 text-base" },
		},
	},
	defaultVariants: { size: "md" },
});

/* Built once. Each entry takes its own props, so `size` needs no second call. */
const avatarSlots = avatarVariants();

/** A round frame for a user's image, with a fallback. */
export function Root({
	className,
	size,
	...props
}: BaseAvatar.Root.Props & VariantProps<typeof avatarVariants>) {
	return (
		<BaseAvatar.Root
			className={mergeClassName(className, (extra) => avatarSlots.root({ size, class: extra }))}
			{...props}
		/>
	);
}

/** The avatar's image. The fallback shows until it loads. */
export function Image({ className, ...props }: BaseAvatar.Image.Props) {
	return (
		<BaseAvatar.Image
			className={mergeClassName(className, (extra) => avatarSlots.image({ class: extra }))}
			{...props}
		/>
	);
}

/** Shown until the image loads, and in place of it if it never does. Usually initials. */
export function Fallback({ className, ...props }: BaseAvatar.Fallback.Props) {
	return (
		<BaseAvatar.Fallback
			className={mergeClassName(className, (extra) => avatarSlots.fallback({ class: extra }))}
			{...props}
		/>
	);
}
