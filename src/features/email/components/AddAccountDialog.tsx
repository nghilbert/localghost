import { useMutation } from "@tanstack/react-query";
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
import { createEmailAccount } from "#/features/email/lib/email.functions";

type AddAccountDialogProps = {
	onAdded: (id: string) => void;
};

type FormState = {
	name: string;
	fromAddress: string;
	imapHost: string;
	imapPort: string;
	imapUser: string;
	imapPassword: string;
	smtpHost: string;
	smtpPort: string;
	smtpSecurity: string;
	smtpUser: string;
	smtpPassword: string;
};

const DEFAULT_FORM: FormState = {
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

export function AddAccountDialog({ onAdded }: AddAccountDialogProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [form, setForm] = useState<FormState>(DEFAULT_FORM);

	function setField(key: keyof FormState, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	const addMutation = useMutation({
		mutationFn: () =>
			createEmailAccount({
				data: {
					name: form.name,
					fromAddress: form.fromAddress,
					imapHost: form.imapHost,
					imapPort: Number(form.imapPort),
					imapUser: form.imapUser,
					imapPassword: form.imapPassword,
					smtpHost: form.smtpHost,
					smtpPort: Number(form.smtpPort),
					smtpSecurity: form.smtpSecurity as "ssl" | "starttls" | "none",
					smtpUser: form.smtpUser,
					smtpPassword: form.smtpPassword,
				},
			}),
		onSuccess: (account) => {
			onAdded(account.id);
			setIsOpen(false);
			setForm(DEFAULT_FORM);
		},
	});

	function renderField(key: keyof FormState, label: string, type = "text") {
		const id = `email-field-${key}`;
		return (
			<div className="flex flex-col gap-1">
				<label htmlFor={id} className="text-xs text-muted-foreground">
					{label}
				</label>
				<Input
					id={id}
					type={type}
					value={form[key]}
					onChange={(e) => setField(key, e.target.value)}
					className="h-8 text-sm"
				/>
			</div>
		);
	}

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
				<div className="grid grid-cols-2 gap-3">
					{renderField("name", "Account name")}
					{renderField("fromAddress", "From address")}
					<p className="col-span-2 text-xs font-medium text-muted-foreground">IMAP (incoming)</p>
					{renderField("imapHost", "Host")}
					{renderField("imapPort", "Port")}
					{renderField("imapUser", "Username")}
					{renderField("imapPassword", "Password", "password")}
					<p className="col-span-2 text-xs font-medium text-muted-foreground">SMTP (outgoing)</p>
					{renderField("smtpHost", "Host")}
					{renderField("smtpPort", "Port")}
					{renderField("smtpUser", "Username (leave blank = same as IMAP)")}
					{renderField("smtpPassword", "Password (leave blank = same as IMAP)", "password")}
				</div>
				<div className="flex justify-end">
					<Button
						onClick={() => addMutation.mutate()}
						disabled={!form.name || !form.imapHost || addMutation.isPending}
					>
						{addMutation.isPending ? "Adding…" : "Add Account"}
					</Button>
				</div>
				{addMutation.isError && (
					<p className="text-sm text-destructive">{(addMutation.error as Error).message}</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
