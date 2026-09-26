import { Field as BaseField } from "@base-ui/react/field";
import type { VariantProps } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";

/** Props for {@link Textarea}. */
export type TextareaProps = BaseField.Control.Props &
	VariantProps<typeof controlVariants> & {
		/** The starting height in lines; the box still grows with its content. */
		rows?: number;
	};

/**
 * A multi-line text box.
 *
 * Base UI has no textarea of its own, so this is a `Field.Control` rendering
 * one. It still gets everything `Input` does, including `onValueChange`.
 */
export function Textarea({ className, size, rows, ...props }: TextareaProps) {
	return (
		<BaseField.Control
			render={<textarea rows={rows} />}
			className={mergeClassName(className, (extra) =>
				controlVariants({
					size,
					/* A textarea grows, so drop the fixed height. */
					class: ["field-sizing-content h-auto min-h-16 py-1.5 placeholder:text-muted-fg", extra],
				}),
			)}
			{...props}
		/>
	);
}
