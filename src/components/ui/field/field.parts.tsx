import { Field as BaseField } from "@base-ui/react/field";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";
import { tv } from "tailwind-variants";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { textVariants } from "#/components/ui/variants/text";

/*
 * `Root` writes `data-orientation`, and the classes below read it back. Parts
 * are siblings, so `Label` never sees the prop `Root` was given; the attribute
 * is how it crosses. `base.css` defines the variants used here.
 */
const fieldVariants = tv({
	extend: textVariants,
	slots: {
		root: [
			"flex w-full gap-2",
			"data-vertical:flex-col",
			"data-horizontal:flex-row data-horizontal:items-center data-horizontal:justify-between data-horizontal:gap-3",
			"data-responsive:flex-col data-responsive:@md:flex-row data-responsive:@md:items-center data-responsive:@md:justify-between data-responsive:@md:gap-3",
		],
		content: "flex flex-1 flex-col gap-0.5",
		error: "text-sm text-danger [&_ul]:ml-4 [&_ul]:list-disc",
	},
});

const fieldSlots = fieldVariants();

/** `responsive` lays out like `horizontal` once the nearest `@container` is at least `md` wide. */
export type FieldOrientation = "vertical" | "horizontal" | "responsive";

/** The field's input, linked to its label and errors. */
export const Control = BaseField.Control;
/** Passes the field's validity state to a render function. */
export const Validity = BaseField.Validity;
/** Wraps one checkbox or radio in a group, with its label. */
export const Item = BaseField.Item;

/**
 * Wraps one control with its label, description and error.
 *
 * When a form library owns validation, pass `invalid`, `touched` and `dirty`.
 * The parts inside pick those up and the control gets `aria-invalid`.
 */
export function Root({
	className,
	orientation = "vertical",
	...props
}: BaseField.Root.Props & { orientation?: FieldOrientation }) {
	return (
		<BaseField.Root
			data-orientation={orientation}
			className={mergeClassName(className, (extra) => fieldSlots.root({ class: extra }))}
			{...props}
		/>
	);
}

/** Stacks a label and description beside a horizontal control. */
export function Content({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: fieldSlots.content({ class: className }) }, props),
	});
}

/** The field's label. */
export function Label({ className, ...props }: BaseField.Label.Props) {
	return (
		<BaseField.Label
			className={mergeClassName(className, (extra) => fieldSlots.label({ class: extra }))}
			{...props}
		/>
	);
}

/** The field's supporting text. */
export function Description({ className, ...props }: BaseField.Description.Props) {
	return (
		<BaseField.Description
			className={mergeClassName(className, (extra) => fieldSlots.description({ class: extra }))}
			{...props}
		/>
	);
}

type ErrorItem = { message?: string } | string | undefined | null;

function messagesOf(errors: readonly ErrorItem[] | undefined): string[] {
	const messages = (errors ?? []).map((error) =>
		typeof error === "string" ? error : error?.message,
	);
	return [...new Set(messages.filter((message): message is string => !!message))];
}

/**
 * Shows `children`, or the messages in `errors` when there are none.
 *
 * `errors` takes strings or `{ message }` objects, so validation output can go
 * straight in. Duplicates are dropped and several messages render as a list.
 */
function FieldError({
	className,
	children,
	errors,
	match = true,
	...props
}: BaseField.Error.Props & { errors?: readonly ErrorItem[] }) {
	const messages = messagesOf(errors);
	let content: ReactNode = children;
	if (!content && messages.length === 1) content = messages[0];
	if (!content && messages.length > 1) {
		content = (
			<ul>
				{messages.map((message) => (
					<li key={message}>{message}</li>
				))}
			</ul>
		);
	}
	if (!content) return null;

	return (
		<BaseField.Error
			// Base UI's Field.Error only points aria-describedby at itself, which a
			// screen reader reads when the control takes focus. Without role="alert"
			// an error raised on submit, with focus on the submit button, is silent.
			role="alert"
			match={match}
			className={mergeClassName(className, (extra) => fieldSlots.error({ class: extra }))}
			{...props}
		>
			{content}
		</BaseField.Error>
	);
}

// Named FieldError internally so the file never shadows the global `Error`.
export { FieldError as Error };
