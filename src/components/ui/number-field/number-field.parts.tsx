import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import { MinusIcon, PlusIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { controlVariants } from "#/components/ui/variants/control";

const numberFieldVariants = tv({
	slots: {
		group: controlVariants({ focus: "within" }),
		input:
			"h-full w-full min-w-0 flex-1 bg-transparent px-2.5 text-center tabular-nums outline-none placeholder:text-muted-fg",
		step: [
			"flex h-full shrink-0 items-center justify-center px-2 text-muted-fg",
			"transition-colors outline-none hover:bg-muted hover:text-fg",
			"data-disabled:pointer-events-none data-disabled:opacity-50",
		],
	},
});

const numberFieldSlots = numberFieldVariants();

/** Holds the number field's value and its parts. */
export const Root = BaseNumberField.Root;
/** Changes the value when dragged. */
export const ScrubArea = BaseNumberField.ScrubArea;

/** Frames the input and its step buttons. */
export function Group({ className, ...props }: BaseNumberField.Group.Props) {
	return (
		<BaseNumberField.Group
			className={mergeClassName(className, (extra) => numberFieldSlots.group({ class: extra }))}
			{...props}
		/>
	);
}

/** The number input. */
export function Input({ className, ...props }: BaseNumberField.Input.Props) {
	return (
		<BaseNumberField.Input
			className={mergeClassName(className, (extra) => numberFieldSlots.input({ class: extra }))}
			{...props}
		/>
	);
}

/** Lowers the value by one step. */
export function Decrement({ className, children, ...props }: BaseNumberField.Decrement.Props) {
	return (
		<BaseNumberField.Decrement
			aria-label="Decrease"
			className={mergeClassName(className, (extra) =>
				numberFieldSlots.step({ class: ["rounded-s-md border-e border-line", extra] }),
			)}
			{...props}
		>
			{children ?? <MinusIcon />}
		</BaseNumberField.Decrement>
	);
}

/** Raises the value by one step. */
export function Increment({ className, children, ...props }: BaseNumberField.Increment.Props) {
	return (
		<BaseNumberField.Increment
			aria-label="Increase"
			className={mergeClassName(className, (extra) =>
				numberFieldSlots.step({ class: ["rounded-e-md border-s border-line", extra] }),
			)}
			{...props}
		>
			{children ?? <PlusIcon />}
		</BaseNumberField.Increment>
	);
}
