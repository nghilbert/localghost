import { ArrowLeftIcon } from "lucide-react";
import { Button } from "#/components/ui/button";
import type { EmailMessageDetail } from "#/features/email/lib/email.types";

type EmailMessageReaderProps = {
	message: EmailMessageDetail;
	onBack: () => void;
	onReply: () => void;
};

export function EmailMessageReader({ message, onBack, onReply }: EmailMessageReaderProps) {
	return (
		<div className="flex flex-1 flex-col overflow-auto">
			<div className="border-b px-4 py-3">
				<button
					type="button"
					className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground md:hidden"
					onClick={onBack}
				>
					<ArrowLeftIcon size={13} />
					Inbox
				</button>
				<h2 className="text-base font-semibold">{message.subject}</h2>
				<p className="text-sm text-muted-foreground">From: {message.from}</p>
				<p className="text-sm text-muted-foreground">{new Date(message.date).toLocaleString()}</p>
				<div className="mt-3">
					<Button variant="outline" size="sm" onClick={onReply}>
						Reply
					</Button>
				</div>
			</div>
			<div className="flex-1 overflow-auto whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed">
				{message.text}
			</div>
		</div>
	);
}
