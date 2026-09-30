import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { AdvancedSection } from "#/components/form/AdvancedSection";
import { useAppForm } from "#/components/form/use-app-form";
import { Button } from "#/components/ui/button";
import { Field } from "#/components/ui/field";
import { Skeleton } from "#/components/ui/skeleton";
import { useResetModelSetting } from "#/features/library/hooks/use-reset-model-setting";
import { useSaveModelSetting } from "#/features/library/hooks/use-save-model-setting";
import { libraryQueries } from "#/features/library/library.queries";
import { perModelOptionsSchema } from "#/features/library/library.schemas";

type ModelSettingsFormValues = z.infer<typeof perModelOptionsSchema>;

type ModelSettingsFormProps = {
	endpointId: string;
	model: string;
};

/** Edits a model's sampling settings, which override the endpoint's and the user's. */
export function ModelSettingsForm({ endpointId, model }: ModelSettingsFormProps) {
	const { data: setting, isPending } = useQuery(
		libraryQueries.modelSettings.detail({ endpointId, model }),
	);
	const save = useSaveModelSetting();
	const reset = useResetModelSetting();

	if (isPending) {
		return (
			<div className="flex flex-col gap-3" aria-busy>
				<Field.Root orientation="responsive">
					<Field.Content>
						<Field.Label>Temperature</Field.Label>
						<Field.Description>Overrides the global default for this model.</Field.Description>
					</Field.Content>
					<Skeleton className="h-8 w-full" />
				</Field.Root>
				<Skeleton className="h-7 w-16" />
			</div>
		);
	}

	return (
		<ModelSettingsFields
			key={JSON.stringify(setting)}
			defaultValues={{
				temperature: setting?.temperature,
				top_p: setting?.top_p,
				top_k: setting?.top_k,
				repeat_penalty: setting?.repeat_penalty,
				max_tokens: setting?.max_tokens,
			}}
			hasSetting={!!setting}
			onSave={(options) => save.mutateAsync({ endpointId, model, options })}
			onReset={() => reset.mutate({ endpointId, model })}
		/>
	);
}

function ModelSettingsFields({
	defaultValues,
	hasSetting,
	onSave,
	onReset,
}: {
	defaultValues: ModelSettingsFormValues;
	hasSetting: boolean;
	onSave: (values: ModelSettingsFormValues) => Promise<unknown>;
	onReset: () => void;
}) {
	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: perModelOptionsSchema },
		onSubmit: ({ value }) => onSave(value),
	});

	return (
		<form.AppForm>
			<form.Form className="gap-3">
				<form.AppField name="temperature">
					{(field) => (
						<field.NumberField
							label="Temperature"
							description="Overrides the global default for this model."
							placeholder="Global default"
							step={0.1}
							min={0}
							max={2}
						/>
					)}
				</form.AppField>

				<AdvancedSection>
					<form.AppField name="top_p">
						{(field) => <field.NumberField label="top_p" step={0.05} min={0} max={1} />}
					</form.AppField>
					<form.AppField name="top_k">
						{(field) => <field.NumberField label="top_k" min={0} />}
					</form.AppField>
					<form.AppField name="repeat_penalty">
						{(field) => <field.NumberField label="Repeat penalty" step={0.1} min={0} />}
					</form.AppField>
					<form.AppField name="max_tokens">
						{(field) => <field.NumberField label="Max output tokens" />}
					</form.AppField>
				</AdvancedSection>

				<div className="flex items-center gap-2">
					<form.SubmitButton size="sm">Save</form.SubmitButton>
					{hasSetting && (
						<Button type="button" color="neutral" variant="outlined" size="sm" onClick={onReset}>
							Reset to defaults
						</Button>
					)}
				</div>
			</form.Form>
		</form.AppForm>
	);
}
