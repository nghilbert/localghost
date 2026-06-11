import { revalidateLogic } from "@tanstack/react-form";
import { useState } from "react";
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
import { FieldError, FieldGroup, FieldLegend, FieldSet } from "#/components/ui/field";
import { createEmailAccount } from "#/features/email/lib/email.functions";
import { useAppForm } from "#/hooks/use-app-form";

const SMTP_SECURITY_OPTIONS = [
	{ value: "ssl", label: "SSL/TLS" },
	{ value: "starttls", label: "STARTTLS" },
	{ value: "none", label: "None" },
];

const PortSchema = z
	.string()
	.regex(/^\d+$/, "Must be a number")
	.refine((port) => Number(port) >= 1 && Number(port) <= 65535, "Must be a valid port");

const EmailAccountSchema = z.object({
	name: z.string().trim().min(1, "Account name is required"),
	fromAddress: z.email("Must be a valid email address"),
	imapHost: z.string().trim().min(1, "IMAP host is required"),
	imapPort: PortSchema,
	imapUser: z.string(),
	imapPassword: z.string(),
	smtpHost: z.string(),
	smtpPort: PortSchema,
	smtpSecurity: z.enum(["ssl", "starttls", "none"]),
	smtpUser: z.string(),
	smtpPassword: z.string(),
});

const EmailAccountDefaults: z.infer<typeof EmailAccountSchema> = {
	name: "",
	fromAddress: "",
	imapHost: "",
	imapPort: "993",
	imapUser: "",
	imapPassword: "",
	smtpHost: "",
	smtpPort: "465",
	smtpSecurity: "ssl",
	smtpUser: "",
	smtpPassword: "",
};

type AddAccountDialogProps = {
	onAdded: (id: string) => void;
};

export function AddAccountDialog({ onAdded }: AddAccountDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: EmailAccountDefaults,
		validators: { onDynamic: EmailAccountSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				const account = await createEmailAccount({
					data: {
						name: value.name.trim(),
						fromAddress: value.fromAddress.trim(),
						imapHost: value.imapHost.trim(),
						imapPort: Number(value.imapPort),
						imapUser: value.imapUser,
						imapPassword: value.imapPassword,
						smtpHost: value.smtpHost.trim(),
						smtpPort: Number(value.smtpPort),
						smtpSecurity: value.smtpSecurity,
						smtpUser: value.smtpUser,
						smtpPassword: value.smtpPassword,
					},
				});
				onAdded(account.id);
				setIsOpen(false);
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to add account");
			}
		},
	});

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
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup className="gap-4">
							<div className="grid grid-cols-2 gap-3">
								<form.AppField name="name">
									{(field) => <field.InputField label="Account name" />}
								</form.AppField>
								<form.AppField name="fromAddress">
									{(field) => <field.InputField label="From address" />}
								</form.AppField>
							</div>
							<FieldSet>
								<FieldLegend>IMAP (incoming)</FieldLegend>
								<div className="grid grid-cols-2 gap-3">
									<form.AppField name="imapHost">
										{(field) => <field.InputField label="Host" />}
									</form.AppField>
									<form.AppField name="imapPort">
										{(field) => <field.InputField label="Port" inputMode="numeric" />}
									</form.AppField>
									<form.AppField name="imapUser">
										{(field) => <field.InputField label="Username" />}
									</form.AppField>
									<form.AppField name="imapPassword">
										{(field) => <field.PasswordField label="Password" />}
									</form.AppField>
								</div>
							</FieldSet>
							<FieldSet>
								<FieldLegend>SMTP (outgoing)</FieldLegend>
								<div className="grid grid-cols-2 gap-3">
									<form.AppField name="smtpHost">
										{(field) => <field.InputField label="Host" />}
									</form.AppField>
									<form.AppField name="smtpPort">
										{(field) => <field.InputField label="Port" inputMode="numeric" />}
									</form.AppField>
									<form.AppField name="smtpSecurity">
										{(field) => (
											<field.SelectField label="Security" options={SMTP_SECURITY_OPTIONS} />
										)}
									</form.AppField>
									<form.AppField name="smtpUser">
										{(field) => <field.InputField label="Username (blank = same as IMAP)" />}
									</form.AppField>
									<form.AppField name="smtpPassword">
										{(field) => <field.PasswordField label="Password (blank = same as IMAP)" />}
									</form.AppField>
								</div>
							</FieldSet>
							<FieldError>{formError}</FieldError>
							<DialogFooter>
								<form.SubmitButton className="w-fit">Add Account</form.SubmitButton>
							</DialogFooter>
						</FieldGroup>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
