import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { SavePresetForm } from "#/features/chat/components/ChatView/SavePresetForm";

type SavePresetDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	systemPrompt: string;
	temperature: number;
	model: string;
};

export function SavePresetDialog({
	open,
	onOpenChange,
	systemPrompt,
	temperature,
	model,
}: SavePresetDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Save preset</DialogTitle>
					<DialogDescription>
						Save the current system prompt and temperature as a reusable preset.
					</DialogDescription>
				</DialogHeader>
				<SavePresetForm
					systemPrompt={systemPrompt}
					temperature={temperature}
					model={model}
					onSuccess={() => onOpenChange(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}
