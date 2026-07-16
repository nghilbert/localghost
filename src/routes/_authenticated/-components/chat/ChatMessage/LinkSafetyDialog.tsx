import type { LinkSafetyConfig, LinkSafetyModalProps } from "streamdown";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";

/**
 * Confirms an external link from model output before opening it, showing the
 * real destination. Replaces Streamdown's built-in modal, which renders inline
 * inside the markdown paragraph (invalid `<p>` nesting) instead of a portal.
 */
export function LinkSafetyDialog({ url, isOpen, onClose, onConfirm }: LinkSafetyModalProps) {
	return (
		<AlertDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<AlertDialogContent data-testid="link-safety-dialog">
				<AlertDialogHeader>
					<AlertDialogTitle>Open external link?</AlertDialogTitle>
					<AlertDialogDescription className="break-all font-mono">{url}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						data-testid="link-safety-open-button"
						onClick={() => {
							onConfirm();
							onClose();
						}}
					>
						Open link
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** The chat renderer's link-safety config: guard every link, confirm via {@link LinkSafetyDialog}. */
export const chatLinkSafety: LinkSafetyConfig = {
	enabled: true,
	renderModal: (props) => <LinkSafetyDialog {...props} />,
};
