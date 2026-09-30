import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { XIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { textVariants } from "#/components/ui/variants/text";

const text = textVariants();

/* Opening and closing use a transition rather than keyframes, so reopening a
 * dialog while it is still closing cancels cleanly. */
const dialogVariants = tv({
	slots: {
		backdrop: [
			"fixed inset-0 isolate z-50 bg-backdrop",
			"transition-opacity duration-100",
			"data-starting-style:opacity-0 data-ending-style:opacity-0",
		],
		viewport: "fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4",
		popup: [
			"relative grid w-full gap-4 rounded-lg outline-none sm:max-w-sm",
			"bg-surface p-4 text-sm text-surface-fg ring-1 ring-line",
			"transition-[opacity,transform] duration-100",
			"data-starting-style:opacity-0 data-ending-style:opacity-0",
		],
		close: "absolute top-2 right-2",
		header: "flex flex-col gap-2",
		footer:
			"-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-lg border-t border-line bg-muted/50 p-4 sm:flex-row sm:justify-end",
		title: text.title({ class: "leading-none" }),
		description: text.description(),
	},
});

const dialogSlots = dialogVariants();

/** Groups the dialog's parts and holds its state. */
export const Root = BaseDialog.Root;
/** Opens the dialog. */
export const Trigger = BaseDialog.Trigger;
/** Closes the dialog. */
export const Close = BaseDialog.Close;
/** Renders the dialog into `document.body`. */
export const Portal = BaseDialog.Portal;

/** Dims the page behind the dialog. */
export function Backdrop({ className, ...props }: BaseDialog.Backdrop.Props) {
	return (
		<BaseDialog.Backdrop
			className={mergeClassName(className, (extra) => dialogSlots.backdrop({ class: extra }))}
			{...props}
		/>
	);
}

/**
 * The backdrop and the panel, with a close button unless you pass
 * `showCloseButton={false}`.
 *
 * Focus, Escape and scroll locking are handled for you. Give the dialog a
 * `Title` so it has a name.
 */
export function Content({
	className,
	children,
	showCloseButton = true,
	...props
}: BaseDialog.Popup.Props & { showCloseButton?: boolean }) {
	return (
		<BaseDialog.Portal>
			<Backdrop />
			<BaseDialog.Viewport className={dialogSlots.viewport()}>
				<BaseDialog.Popup
					className={mergeClassName(className, (extra) => dialogSlots.popup({ class: extra }))}
					{...props}
				>
					{children}
					{showCloseButton && (
						<BaseDialog.Close
							aria-label="Close"
							className={dialogSlots.close()}
							render={<Button variant="quiet" size="sm" iconOnly />}
						>
							<XIcon />
						</BaseDialog.Close>
					)}
				</BaseDialog.Popup>
			</BaseDialog.Viewport>
		</BaseDialog.Portal>
	);
}

/** Stacks the dialog's title and description. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: dialogSlots.header({ class: className }) }, props),
	});
}

/** Holds the dialog's actions at the bottom. */
export function Footer({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: dialogSlots.footer({ class: className }) }, props),
	});
}

/** The dialog's title, which also names it for screen readers. */
export function Title({ className, ...props }: BaseDialog.Title.Props) {
	return (
		<BaseDialog.Title
			className={mergeClassName(className, (extra) => dialogSlots.title({ class: extra }))}
			{...props}
		/>
	);
}

/** The dialog's supporting text. */
export function Description({ className, ...props }: BaseDialog.Description.Props) {
	return (
		<BaseDialog.Description
			className={mergeClassName(className, (extra) => dialogSlots.description({ class: extra }))}
			{...props}
		/>
	);
}
