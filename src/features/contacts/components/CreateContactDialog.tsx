import { useMutation } from "@tanstack/react-query";
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
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { createContact } from "#/features/contacts/lib/contact.functions";

type CreateContactDialogProps = {
	onCreated: () => void;
};

export function CreateContactDialog({ onCreated }: CreateContactDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [name, setName] = useState("");
	const [emailsInput, setEmailsInput] = useState("");
	const [phonesInput, setPhonesInput] = useState("");
	const [notes, setNotes] = useState("");

	const createMutation = useMutation({
		mutationFn: createContact,
		onSuccess: () => {
			onCreated();
			setIsOpen(false);
			resetForm();
		},
	});

	function resetForm() {
		setName("");
		setEmailsInput("");
		setPhonesInput("");
		setNotes("");
	}

	function handleCreate() {
		const emails = emailsInput
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const phones = phonesInput
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		createMutation.mutate({ data: { name, emails, phones, notes: notes || undefined } });
	}

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
				<div className="flex flex-col gap-3">
					<Input
						placeholder="Name *"
						value={name}
						onChange={(e) => setName(e.target.value)}
						autoFocus
					/>
					<Input
						placeholder="Email(s), comma-separated"
						value={emailsInput}
						onChange={(e) => setEmailsInput(e.target.value)}
					/>
					<Input
						placeholder="Phone(s), comma-separated"
						value={phonesInput}
						onChange={(e) => setPhonesInput(e.target.value)}
					/>
					<Textarea
						placeholder="Notes (optional)"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						rows={2}
					/>
					<Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending}>
						{createMutation.isPending ? "Creating…" : "Create contact"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
