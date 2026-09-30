import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { XIcon } from "lucide-react";
import { tv } from "tailwind-variants";
import { Button } from "#/components/ui/button";
import { mergeClassName } from "#/components/ui/variants/class-name";
import { textVariants } from "#/components/ui/variants/text";

const text = textVariants();

/*
 * A sheet is a dialog pinned to one edge of the screen. `Content` writes the
 * edge as `data-side`, and the `side-*` variants in `base.css` read it back.
 */
const sheetVariants = tv({
	slots: {
		backdrop: [
			"fixed inset-0 z-50 bg-backdrop",
			"transition-opacity duration-150",
			"data-starting-style:opacity-0 data-ending-style:opacity-0",
		],
		popup: [
			"fixed z-50 flex flex-col gap-4 overflow-y-auto outline-none",
			"bg-surface text-sm text-surface-fg shadow-lg",
			"transition-[opacity,translate] duration-200 ease-in-out",
			"data-starting-style:opacity-0 data-ending-style:opacity-0",
			"side-top:inset-x-0 side-top:top-0 side-top:max-h-full side-top:border-b",
			"side-top:data-starting-style:-translate-y-10 side-top:data-ending-style:-translate-y-10",
			"side-bottom:inset-x-0 side-bottom:bottom-0 side-bottom:max-h-full side-bottom:border-t",
			"side-bottom:data-starting-style:translate-y-10 side-bottom:data-ending-style:translate-y-10",
			"side-left:inset-y-0 side-left:left-0 side-left:h-full side-left:w-3/4 side-left:border-r side-left:sm:max-w-sm",
			"side-left:data-starting-style:-translate-x-10 side-left:data-ending-style:-translate-x-10",
			"side-right:inset-y-0 side-right:right-0 side-right:h-full side-right:w-3/4 side-right:border-l side-right:sm:max-w-sm",
			"side-right:data-starting-style:translate-x-10 side-right:data-ending-style:translate-x-10",
		],
		close: "absolute top-3 right-3",
		header: "flex flex-col gap-0.5 p-4",
		footer: "mt-auto flex flex-col gap-2 p-4",
		title: text.title(),
		description: text.description(),
	},
});

const sheetSlots = sheetVariants();

/** The edge a sheet slides in from. */
export type SheetSide = "top" | "right" | "bottom" | "left";

/** Groups the sheet's parts and holds its state. */
export const Root = BaseDialog.Root;
/** Opens the sheet. */
export const Trigger = BaseDialog.Trigger;
/** Closes the sheet. */
export const Close = BaseDialog.Close;

/**
 * The backdrop and the panel, sliding in from `side`, with a close button
 * unless you pass `showCloseButton={false}`. Give it a `Title` so it has a name.
 */
export function Content({
	className,
	children,
	side = "right",
	showCloseButton = true,
	...props
}: BaseDialog.Popup.Props & { side?: SheetSide; showCloseButton?: boolean }) {
	return (
		<BaseDialog.Portal>
			<BaseDialog.Backdrop className={sheetSlots.backdrop()} />
			<BaseDialog.Popup
				data-side={side}
				className={mergeClassName(className, (extra) => sheetSlots.popup({ class: extra }))}
				{...props}
			>
				{children}
				{showCloseButton && (
					<BaseDialog.Close
						aria-label="Close"
						className={sheetSlots.close()}
						render={<Button variant="quiet" color="neutral" size="sm" iconOnly />}
					>
						<XIcon />
					</BaseDialog.Close>
				)}
			</BaseDialog.Popup>
		</BaseDialog.Portal>
	);
}

/** Stacks the sheet's title and description. */
export function Header({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sheetSlots.header({ class: className }) }, props),
	});
}

/** Holds the sheet's actions at the bottom. */
export function Footer({ render, className, ...props }: useRender.ComponentProps<"div">) {
	return useRender({
		defaultTagName: "div",
		render,
		props: mergeProps<"div">({ className: sheetSlots.footer({ class: className }) }, props),
	});
}

/** The sheet's title, which also names it for screen readers. */
export function Title({ className, ...props }: BaseDialog.Title.Props) {
	return (
		<BaseDialog.Title
			className={mergeClassName(className, (extra) => sheetSlots.title({ class: extra }))}
			{...props}
		/>
	);
}

/** The sheet's supporting text. */
export function Description({ className, ...props }: BaseDialog.Description.Props) {
	return (
		<BaseDialog.Description
			className={mergeClassName(className, (extra) => sheetSlots.description({ class: extra }))}
			{...props}
		/>
	);
}
