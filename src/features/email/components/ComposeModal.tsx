import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { sendEmail } from "#/features/email/lib/email.functions";

type ComposeModalProps = {
	accountId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	replyTo?: { to: string; subject: string };
};

export function ComposeModal({ accountId, open, onOpenChange, replyTo }: ComposeModalProps) {
	const [to, setTo] = useState(replyTo?.to ?? "");
	const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
	const [body, setBody] = useState("");

	const sendMutation = useMutation({
		mutationFn: () => sendEmail({ data: { accountId, to, subject, text: body } }),
		onSuccess: () => {
			onOpenChange(false);
			setTo("");
			setSubject("");
			setBody("");
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Compose</DialogTitle>
					<DialogDescription>Send an email from your connected account.</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
					<Input
						placeholder="Subject"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
					/>
					<Textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Write your message…"
						rows={12}
						className="resize-y"
					/>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => sendMutation.mutate()}
							disabled={!to || !subject || !body || sendMutation.isPending}
						>
							{sendMutation.isPending ? "Sending…" : "Send"}
						</Button>
					</div>
					{sendMutation.isError && (
						<p className="text-sm text-destructive">
							Failed to send: {(sendMutation.error as Error).message}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
