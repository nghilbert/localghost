import { Field as BaseField } from "@base-ui/react/field";
import { Input as BaseInput } from "@base-ui/react/input";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { MouseEvent } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Button, type ButtonProps } from "#/components/ui/button";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";

/*
 * The control box is drawn once, on `Root`, and the input or textarea inside it
 * draws nothing of its own. An addon above or below the control turns the box
 * into a column (`has-block-addon` in `base.css`).
 */
const inputGroupVariants = tv({
	slots: {
		root: controlVariants({
			focus: "within",
			class: [
				"relative h-auto min-h-8 px-0",
				"has-block-addon:flex-col has-block-addon:items-stretch",
				"has-disabled:opacity-50",
			],
		}),
		addon: "flex cursor-text items-center gap-2 text-sm text-muted-fg select-none",
		input:
			"h-8 min-w-0 flex-1 bg-transparent px-2.5 outline-none placeholder:text-muted-fg disabled:cursor-not-allowed",
		textarea:
			"field-sizing-content min-h-16 w-full flex-1 resize-none bg-transparent px-2.5 py-2 outline-none placeholder:text-muted-fg disabled:cursor-not-allowed",
		text: "flex items-center gap-2 text-sm text-muted-fg",
	},
	variants: {
		/** Where an `Addon` sits relative to the control. */
		align: {
			"inline-start": { addon: "order-first pl-2" },
			"inline-end": { addon: "order-last pr-1" },
			"block-start": { addon: "order-first w-full justify-start px-2.5 pt-2" },
			"block-end": { addon: "order-last w-full justify-start px-2.5 pb-2" },
		},
	},
	defaultVariants: { align: "inline-start" },
});

const inputGroupSlots = inputGroupVariants();

/**
 * A text control with things attached to it: icons, buttons, a row of
 * attachments above a textarea. Name it with a `Field.Label` or `aria-label`
 * on the control inside.
 */
export function Root({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">(
			{ role: "group", className: inputGroupSlots.root({ class: className }) },
			props,
		),
	});
}

/** Clicking empty space in an addon focuses the group's control, as it would in a native input. */
function focusControl(event: MouseEvent<HTMLDivElement>) {
	if (event.target instanceof Element && event.target.closest("button, a, input, textarea")) return;
	event.currentTarget.parentElement?.querySelector<HTMLElement>("input, textarea")?.focus();
}

/** Holds text, icons, or buttons beside the input. */
export function Addon({
	render,
	className,
	align = "inline-start",
	...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof inputGroupVariants>) {
	return useRender({
		defaultTagName: "div",
		render,
		state: { align },
		props: mergeProps<"div">(
			{
				onClick: focusControl,
				className: inputGroupSlots.addon({ align, class: className }),
			},
			props,
		),
	});
}

/** The group's text input. */
export function Input({ className, ...props }: BaseInput.Props) {
	return (
		<BaseInput
			className={mergeClassName(className, (extra) => inputGroupSlots.input({ class: extra }))}
			{...props}
		/>
	);
}

/** A `Field.Control` rendering a `<textarea>` that grows with its content. */
export function Textarea({ className, ...props }: BaseField.Control.Props) {
	return (
		<BaseField.Control
			render={<textarea />}
			className={mergeClassName(className, (extra) => inputGroupSlots.textarea({ class: extra }))}
			{...props}
		/>
	);
}

/** A small quiet button, sized to sit inside the box. Defaults to `type="button"`. */
function GroupButton({ type = "button", variant = "quiet", size = "sm", ...props }: ButtonProps) {
	return <Button type={type} variant={variant} size={size} {...props} />;
}

// Named GroupButton internally so the file can still import the library's `Button`.
export { GroupButton as Button };

/** Plain text inside an addon. */
export function Text({ render, className, ...props }: useRender.ComponentProps<"span">) {
	return useRender({
		defaultTagName: "span",
		render,
		props: mergeProps<"span">({ className: inputGroupSlots.text({ class: className }) }, props),
	});
}
