import { revalidateLogic } from "@tanstack/react-form";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { createContact } from "#/features/contacts/lib/contact.functions";
import { useAppForm } from "#/hooks/use-app-form";

const ContactSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	emailsInput: z.string(),
	phonesInput: z.string(),
	notes: z.string(),
});

const ContactDefaults: z.infer<typeof ContactSchema> = {
	name: "",
	emailsInput: "",
	phonesInput: "",
	notes: "",
};

function splitList(input: string): string[] {
	return input
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

type CreateContactDialogProps = {
	onCreated: () => void;
};

export function CreateContactDialog({ onCreated }: CreateContactDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: ContactDefaults,
		validators: { onDynamic: ContactSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createContact({
					data: {
						name: value.name.trim(),
						emails: splitList(value.emailsInput),
						phones: splitList(value.phonesInput),
						notes: value.notes || undefined,
					},
				});
				toast.success("Contact created");
				onCreated();
				setIsOpen(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to create contact");
			}
		},
	});

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
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-3">
							<form.AppField name="name">
								{(field) => <field.InputField label="Name" autoFocus />}
							</form.AppField>
							<form.AppField name="emailsInput">
								{(field) => <field.InputField label="Email(s)" placeholder="Comma-separated" />}
							</form.AppField>
							<form.AppField name="phonesInput">
								{(field) => <field.InputField label="Phone(s)" placeholder="Comma-separated" />}
							</form.AppField>
							<form.AppField name="notes">
								{(field) => <field.TextareaField label="Notes (optional)" rows={2} />}
							</form.AppField>
							<FieldError>{formError}</FieldError>
							<DialogFooter>
								<form.SubmitButton>Create contact</form.SubmitButton>
							</DialogFooter>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
