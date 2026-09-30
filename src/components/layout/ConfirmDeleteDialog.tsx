import type { ReactNode } from "react";
import { AlertDialog } from "#/components/ui/alert-dialog";

type ConfirmDeleteDialogProps = {
	/** Open while something is pending deletion. */
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description: ReactNode;
	isPending: boolean;
	/** Runs the delete; the caller closes the dialog once it succeeds. */
	onConfirm: () => void;
};

/** Asks before a permanent delete, with Cancel and a danger Delete. */
export function ConfirmDeleteDialog({
	open,
	onOpenChange,
	title,
	description,
	isPending,
	onConfirm,
}: ConfirmDeleteDialogProps) {
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>{title}</AlertDialog.Title>
					<AlertDialog.Description>{description}</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel />
					<AlertDialog.Action color="danger" disabled={isPending} onClick={onConfirm}>
						Delete
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
