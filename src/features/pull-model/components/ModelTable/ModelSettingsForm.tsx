import { revalidateLogic } from "@tanstack/react-form";
import { ChevronDownIcon } from "lucide-react";
import type { z } from "zod/v4";
import { perModelOptionsSchema } from "#/entities/model-setting/schemas";
import { useModelSetting } from "#/entities/model-setting/use-model-setting";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { Button } from "#/shared/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/shared/ui/collapsible";
import { Field } from "#/shared/ui/field";
import { Skeleton } from "#/shared/ui/skeleton";

type ModelSettingsFormValues = z.infer<typeof perModelOptionsSchema>;

type ModelSettingsFormProps = {
	endpointId: string;
	model: string;
	/** Hides `num_ctx`, an Ollama-only concept; cloud providers ignore it. */
	showNumCtx: boolean;
};

/** Inline per-model generation overrides: the most specific of the three tuning scopes. */
export function ModelSettingsForm({ endpointId, model, showNumCtx }: ModelSettingsFormProps) {
	const { setting, isPending, save, reset } = useModelSetting({ endpointId, model });

	if (isPending) return <Skeleton className="h-24 w-full" />;

	return (
		<ModelSettingsFields
			key={JSON.stringify(setting)}
			defaultValues={{
				num_ctx: setting?.num_ctx,
				temperature: setting?.temperature,
				top_p: setting?.top_p,
				top_k: setting?.top_k,
				repeat_penalty: setting?.repeat_penalty,
				num_predict: setting?.num_predict,
			}}
			showNumCtx={showNumCtx}
			hasSetting={!!setting}
			onSave={(values) => save.mutate(values)}
			onReset={() => reset.mutate()}
		/>
	);
}

function ModelSettingsFields({
	defaultValues,
	showNumCtx,
	hasSetting,
	onSave,
	onReset,
}: {
	defaultValues: ModelSettingsFormValues;
	showNumCtx: boolean;
	hasSetting: boolean;
	onSave: (values: ModelSettingsFormValues) => void;
	onReset: () => void;
}) {
	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: perModelOptionsSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => onSave(value),
	});

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
				{showNumCtx && (
					<form.AppField name="num_ctx">
						{(field) => (
							<field.NumberField
								label="Context window (num_ctx)"
								description="Tokens of context this model keeps in memory."
								placeholder="Provider default"
							/>
						)}
					</form.AppField>
				)}

				<form.AppField name="temperature">
					{(field) => (
						<field.NumberField
							label="Temperature"
							description="Overrides the global default for this model."
							placeholder="Global default"
							step="0.1"
							min={0}
							max={2}
						/>
					)}
				</form.AppField>

				<Collapsible>
					<CollapsibleTrigger
						render={
							<Button type="button" variant="ghost" size="sm" className="text-muted-foreground" />
						}
					>
						<ChevronDownIcon />
						Advanced
					</CollapsibleTrigger>
					<CollapsibleContent className="space-y-3 pt-2">
						<form.AppField name="top_p">
							{(field) => <field.NumberField label="top_p" step="0.05" min={0} max={1} />}
						</form.AppField>
						<form.AppField name="top_k">
							{(field) => <field.NumberField label="top_k" min={0} />}
						</form.AppField>
						<form.AppField name="repeat_penalty">
							{(field) => <field.NumberField label="Repeat penalty" step="0.1" min={0} />}
						</form.AppField>
						<form.AppField name="num_predict">
							{(field) => <field.NumberField label="Max output tokens (num_predict)" />}
						</form.AppField>
					</CollapsibleContent>
				</Collapsible>

				<Field orientation="horizontal">
					<form.SubmitButton size="sm">Save</form.SubmitButton>
					{hasSetting && (
						<Button type="button" variant="outline" size="sm" onClick={onReset}>
							Reset to defaults
						</Button>
					)}
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
