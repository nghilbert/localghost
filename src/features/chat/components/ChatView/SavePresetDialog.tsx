import { revalidateLogic } from "@tanstack/react-form";
import { z } from "zod/v4";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { useAppForm } from "#/hooks/use-app-form";

const PresetNameSchema = z.object({
	name: z.string().trim().min(1, "Name is required").max(100),
});

type SavePresetDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (name: string) => void;
};

export function SavePresetDialog({ open, onOpenChange, onSave }: SavePresetDialogProps) {
	const form = useAppForm({
		defaultValues: { name: "" },
		validators: { onDynamic: PresetNameSchema },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value, formApi }) => {
			onSave(value.name.trim());
			formApi.reset();
			onOpenChange(false);
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Save preset</DialogTitle>
					<DialogDescription>
						Save the current system prompt and temperature as a reusable preset.
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
				>
					<form.AppForm>
						<form.AppField name="name">
							{(field) => <field.InputField label="Name" placeholder="My preset" />}
						</form.AppField>
						<DialogFooter>
							<form.SubmitButton>Save</form.SubmitButton>
						</DialogFooter>
					</form.AppForm>
				</form>
			</DialogContent>
		</Dialog>
	);
}
