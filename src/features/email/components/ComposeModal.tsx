import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { sendEmail } from "#/features/email/lib/email.functions";

type Props = {
	accountId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	replyTo?: { to: string; subject: string };
};

export function ComposeModal({ accountId, open, onOpenChange, replyTo }: Props) {
	const [to, setTo] = useState(replyTo?.to ?? "");
	const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : "");
	const [body, setBody] = useState("");

	const sendMut = useMutation({
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
				</DialogHeader>
				<div className="flex flex-col gap-3">
					<Input placeholder="To" value={to} onChange={(e) => setTo(e.target.value)} />
					<Input
						placeholder="Subject"
						value={subject}
						onChange={(e) => setSubject(e.target.value)}
					/>
					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Write your message…"
						rows={12}
						className="resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
					/>
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button
							onClick={() => sendMut.mutate()}
							disabled={!to || !subject || !body || sendMut.isPending}
						>
							{sendMut.isPending ? "Sending…" : "Send"}
						</Button>
					</div>
					{sendMut.isError && (
						<p className="text-sm text-destructive">
							Failed to send: {(sendMut.error as Error).message}
						</p>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
