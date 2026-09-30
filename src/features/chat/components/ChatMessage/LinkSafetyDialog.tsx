import { AlertDialog } from "#/components/ui/alert-dialog";

type LinkSafetyDialogProps = {
	url: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

/** Shows the real destination of a link from model output and opens it in a new tab on confirm. */
export function LinkSafetyDialog({ url, open, onOpenChange }: LinkSafetyDialogProps) {
	return (
		<AlertDialog.Root open={open} onOpenChange={onOpenChange}>
			<AlertDialog.Content>
				<AlertDialog.Header>
					<AlertDialog.Title>Open external link?</AlertDialog.Title>
					<AlertDialog.Description className="font-mono break-all">{url}</AlertDialog.Description>
				</AlertDialog.Header>
				<AlertDialog.Footer>
					<AlertDialog.Cancel />
					<AlertDialog.Action
						onClick={() => {
							window.open(url, "_blank", "noreferrer");
							onOpenChange(false);
						}}
					>
						Open link
					</AlertDialog.Action>
				</AlertDialog.Footer>
			</AlertDialog.Content>
		</AlertDialog.Root>
	);
}
