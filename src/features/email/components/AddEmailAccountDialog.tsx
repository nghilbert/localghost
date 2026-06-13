import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { AddEmailAccountForm } from "#/features/email/components/AddEmailAccountForm";

type AddEmailAccountDialogProps = {
	onAdded: (id: string) => void;
};

export function AddEmailAccountDialog({ onAdded }: AddEmailAccountDialogProps) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm" className="w-full text-xs">
					+ Add account
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Email Account</DialogTitle>
					<DialogDescription>
						Connect an IMAP/SMTP account to read and send email.
					</DialogDescription>
				</DialogHeader>
				<AddEmailAccountForm
					onSuccess={(id) => {
						setIsOpen(false);
						onAdded(id);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}
