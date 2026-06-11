import { revalidateLogic } from "@tanstack/react-form";
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
} from "#/components/ui/dialog";
import { FieldError, FieldGroup } from "#/components/ui/field";
import { sendEmail } from "#/features/email/lib/email.functions";
import { useAppForm } from "#/hooks/use-app-form";

const ComposeSchema = z.object({
	to: z.email("Must be a valid email address"),
	subject: z.string().trim().min(1, "Subject is required"),
	body: z.string().trim().min(1, "Message is required"),
});

type ComposeModalProps = {
	accountId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	replyTo?: { to: string; subject: string };
};

export function ComposeModal({ accountId, open, onOpenChange, replyTo }: ComposeModalProps) {
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: {
			to: replyTo?.to ?? "",
			subject: replyTo ? `Re: ${replyTo.subject}` : "",
			body: "",
		},
		validators: { onDynamic: ComposeSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await sendEmail({
					data: { accountId, to: value.to, subject: value.subject, text: value.body },
				});
				toast.success("Email sent");
				onOpenChange(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to send");
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Compose</DialogTitle>
					<DialogDescription>Send an email from your connected account.</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-3">
							<form.AppField name="to">
								{(field) => <field.InputField label="To" placeholder="someone@example.com" />}
							</form.AppField>
							<form.AppField name="subject">
								{(field) => <field.InputField label="Subject" />}
							</form.AppField>
							<form.AppField name="body">
								{(field) => (
									<field.TextareaField
										label="Message"
										placeholder="Write your message…"
										rows={12}
										className="resize-y"
									/>
								)}
							</form.AppField>
							<FieldError>{formError}</FieldError>
							<DialogFooter>
								<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
									Cancel
								</Button>
								<form.SubmitButton>Send</form.SubmitButton>
							</DialogFooter>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
