import { useState } from "react";
import { useDeleteAccount } from "#/routes/_authenticated/settings/-hooks/use-delete-account";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/shared/components/ui/alert-dialog";
import { Button } from "#/shared/components/ui/button";
import { Field, FieldLabel } from "#/shared/components/ui/field";
import { Input } from "#/shared/components/ui/input";

/** Requires the user's email before permanently deleting the account. */
export function DeleteAccountDialog({ email }: { email: string }) {
	const deleteAccount = useDeleteAccount();
	const [confirmation, setConfirmation] = useState("");

	return (
		<AlertDialog
			onOpenChange={(open) => {
				if (!open) setConfirmation("");
			}}
		>
			<AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
				Delete account
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete your account?</AlertDialogTitle>
					<AlertDialogDescription>
						This permanently deletes your account and all conversations, memories, and endpoints.
						This cannot be undone.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<Field>
					<FieldLabel htmlFor="delete-confirm-email">
						Type your email ({email}) to confirm
					</FieldLabel>
					<Input
						id="delete-confirm-email"
						data-testid="delete-account-confirm-input"
						value={confirmation}
						onChange={(event) => setConfirmation(event.target.value)}
						autoComplete="off"
					/>
				</Field>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={confirmation !== email || deleteAccount.isPending}
						onClick={(event) => {
							event.preventDefault();
							deleteAccount.mutate();
						}}
					>
						{deleteAccount.isPending ? "Deleting…" : "Delete account"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
