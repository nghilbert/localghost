import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldError, FieldGroup } from "#/components/ui/field";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "#/components/ui/item";
import {
	createPreset,
	deletePreset,
	presetsQueryOptions,
} from "#/features/chat/lib/preset.functions";
import { useAppForm } from "#/hooks/use-app-form";

const PresetSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
	description: z.string(),
	systemPrompt: z.string().trim().min(1, "System prompt is required"),
});

const PresetDefaults: z.infer<typeof PresetSchema> = {
	name: "",
	description: "",
	systemPrompt: "",
};

export function PresetsTab() {
	const queryClient = useQueryClient();
	const { data: presets = [] } = useQuery(presetsQueryOptions());
	const [formError, setFormError] = useState<string | null>(null);

	const form = useAppForm({
		defaultValues: PresetDefaults,
		validators: { onDynamic: PresetSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value, formApi }) => {
			setFormError(null);
			try {
				await createPreset({
					data: {
						name: value.name.trim(),
						description: value.description.trim() || undefined,
						systemPrompt: value.systemPrompt.trim(),
					},
				});
				queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
				toast.success("Preset saved");
				formApi.reset();
			} catch (error) {
				setFormError(error instanceof Error ? error.message : "Failed to save preset");
			}
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deletePreset({ data: { id } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chat-presets"] });
			toast.success("Preset deleted");
		},
		onError: (error) => toast.error(error.message),
	});

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>New preset</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							form.handleSubmit();
						}}
					>
						<form.AppForm>
							<FieldGroup className="gap-3">
								<form.AppField name="name">
									{(field) => <field.InputField label="Name" placeholder="Preset name" />}
								</form.AppField>
								<form.AppField name="description">
									{(field) => <field.InputField label="Description (optional)" />}
								</form.AppField>
								<form.AppField name="systemPrompt">
									{(field) => (
										<field.TextareaField
											label="System prompt"
											placeholder="System prompt…"
											rows={4}
											className="resize-none"
										/>
									)}
								</form.AppField>
								<FieldError>{formError}</FieldError>
								<Field orientation="horizontal">
									<form.SubmitButton size="sm">Save preset</form.SubmitButton>
								</Field>
							</FieldGroup>
						</form.AppForm>
					</form>
				</CardContent>
			</Card>
			{presets.length > 0 && (
				<ItemGroup>
					{presets.map((p) => (
						<Item key={p.id} variant="outline">
							<ItemContent>
								<ItemTitle>{p.name}</ItemTitle>
								{p.description && <ItemDescription>{p.description}</ItemDescription>}
								<ItemDescription>
									{p.systemPrompt.slice(0, 100)}
									{p.systemPrompt.length > 100 ? "…" : ""}
								</ItemDescription>
							</ItemContent>
							<ItemActions>
								<Button
									variant="ghost"
									size="icon"
									className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
									onClick={() => deleteMutation.mutate(p.id)}
									aria-label="Delete preset"
								>
									<TrashIcon size={13} />
								</Button>
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			)}
		</div>
	);
}
