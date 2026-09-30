import { useState } from "react";
import { AlertDialog } from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useDeleteAccount } from "#/features/account/hooks/use-delete-account";

/** Requires the user's email before permanently deleting the account. */
export function DeleteAccountDialog({ email }: { email: string }) {
	const deleteAccount = useDeleteAccount();
	const [confirmation, setConfirmation] = useState("");

	return (
		<AlertDialog.Root
			onOpenChange={(open) => {
				if (!open) setConfirmation("");
			}}
		>
			<AlertDialog.Trigger render={<Button color="danger" variant="soft" size="sm" />}>
				Delete account
			</AlertDialog.Trigger>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Delete your account?</AlertDialog.Title>
					<AlertDialog.Description>
						This permanently deletes your account and all conversations, memories, and endpoints.
						This cannot be undone.
					</AlertDialog.Description>
				</AlertDialog.Header>
				<Field.Root>
					<Field.Label>Type your email ({email}) to confirm</Field.Label>
					<Input value={confirmation} onValueChange={setConfirmation} autoComplete="off" />
				</Field.Root>
				<AlertDialog.Footer>
					<AlertDialog.Cancel />
					<AlertDialog.Action
						color="danger"
						variant="soft"
						disabled={confirmation !== email || deleteAccount.isPending}
						onClick={() => deleteAccount.mutate()}
					>
						{deleteAccount.isPending ? "Deleting..." : "Delete account"}
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
