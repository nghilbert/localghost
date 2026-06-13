import { PlusIcon } from "lucide-react";
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
import { CreateContactForm } from "#/features/contacts/components/CreateContactForm";

export function CreateContactDialog() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-1.5">
					<PlusIcon size={13} />
					New contact
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>New Contact</DialogTitle>
					<DialogDescription>Add a contact with email and phone details.</DialogDescription>
				</DialogHeader>
				<CreateContactForm onSuccess={() => setIsOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}
