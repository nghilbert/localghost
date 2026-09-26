import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import type { ComponentProps } from "react";
import { Button, type ButtonProps } from "#/components/ui/button";
import { Dialog } from "#/components/ui/dialog";

/**
 * A dialog that clicking outside does not dismiss. Only `Root` and `Trigger` are its
 * own; the other parts come from `Dialog`.
 */
export const Root = BaseAlertDialog.Root;
/** Opens the alert dialog. */
export const Trigger = BaseAlertDialog.Trigger;
/** Stacks the alert dialog's title and description. */
export const Header = Dialog.Header;
/** Holds the alert dialog's actions at the bottom. */
export const Footer = Dialog.Footer;
/** The alert dialog's title, which also names it for screen readers. */
export const Title = Dialog.Title;
/** The alert dialog's supporting text. */
export const Description = Dialog.Description;

/** Has no corner close button: the reader has to pick one of the actions. */
export function Content(props: ComponentProps<typeof Dialog.Content>) {
	return <Dialog.Content showCloseButton={false} {...props} />;
}

/** Closes the dialog and does nothing else. */
export function Cancel({ children = "Cancel", ...props }: BaseAlertDialog.Close.Props) {
	return (
		<BaseAlertDialog.Close render={<Button variant="outlined" />} {...props}>
			{children}
		</BaseAlertDialog.Close>
	);
}

/**
 * The confirming action. It does not close the dialog by itself, so an async
 * action can keep it open until the work settles.
 */
export function Action(props: ButtonProps) {
	return <Button {...props} />;
}
