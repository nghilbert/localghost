import { Input as BaseInput } from "@base-ui/react/input";
import type { VariantProps } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";

/** Props for {@link Input}. */
export type InputProps = Omit<BaseInput.Props, "size"> & VariantProps<typeof controlVariants>;

/** A single line text input. */
export function Input({ className, size, ...props }: InputProps) {
	return (
		<BaseInput
			className={mergeClassName(className, (extra) =>
				controlVariants({
					size,
					class: [
						"placeholder:text-muted-fg",
						"file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-fg",
						extra,
					],
				}),
			)}
			{...props}
		/>
	);
}
