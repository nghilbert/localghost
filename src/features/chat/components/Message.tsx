import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { tv } from "tailwind-variants";

/*
 * `Message` writes `align` as `data-align`; the parts inside read it back with
 * the `in-align-end` variant from `variants.css`.
 */
const messageVariants = tv({
	slots: {
		root: "group/message relative flex w-full min-w-0 gap-2 text-sm align-end:flex-row-reverse",
		content: "flex w-full min-w-0 flex-col gap-2.5 wrap-break-word in-align-end:items-end",
		footer:
			"flex max-w-full min-w-0 items-center px-3 text-xs font-medium text-muted-fg in-align-end:justify-end",
	},
});

const messageSlots = messageVariants();

/**
 * One turn in a conversation: its `MessageContent`, then an optional
 * `MessageFooter`. `align="end"` puts it on the reader's own side.
 */
export function Message({
	render,
	className,
	align = "start",
	...props
}: useRender.ComponentProps<"div"> & { align?: "start" | "end" }) {
	return useRender({
		defaultTagName: "div",
		render,
		state: { align },
		props: mergeProps<"div">({ className: messageSlots.root({ class: className }) }, props),
	});
}

/** The bubbles, images and notes a message is made of, lined up on the message's side. */
export function MessageContent({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: messageSlots.content({ class: className }) }, props),
	});
}

/** Small print under a message: actions, timing. */
export function MessageFooter({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: messageSlots.footer({ class: className }) }, props),
	});
}
