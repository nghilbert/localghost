import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { ComposeEmailForm } from "#/features/email/components/ComposeEmailForm";

type ComposeDialogProps = {
	accountId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	replyTo?: { to: string; subject: string };
};

export function ComposeDialog({ accountId, open, onOpenChange, replyTo }: ComposeDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Compose</DialogTitle>
					<DialogDescription>Send an email from your connected account.</DialogDescription>
				</DialogHeader>
				<ComposeEmailForm
					accountId={accountId}
					replyTo={replyTo}
					onSuccess={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
