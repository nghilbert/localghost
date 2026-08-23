import { ChevronDownIcon } from "lucide-react";
import type { z } from "zod/v4";
import { Button } from "#/shared/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "#/shared/components/ui/collapsible";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "#/shared/components/ui/field";
import { Skeleton } from "#/shared/components/ui/skeleton";
import { perModelOptionsSchema } from "#/shared/domain/model-setting/schemas";
import { useModelSetting } from "#/shared/domain/model-setting/use-model-settings";
import { useAppForm } from "#/shared/hooks/use-app-form";

type ModelSettingsFormValues = z.infer<typeof perModelOptionsSchema>;

type ModelSettingsFormProps = {
	endpointId: string;
	model: string;
};

/** Inline per-model generation overrides: the most specific of the three tuning scopes. */
export function ModelSettingsForm({ endpointId, model }: ModelSettingsFormProps) {
	const { setting, isPending, save, reset } = useModelSetting({ endpointId, model });

	if (isPending) {
		return (
			<FieldGroup className="gap-3">
				<Field orientation="responsive">
					<FieldContent>
						<FieldLabel>Temperature</FieldLabel>
						<FieldDescription>Overrides the global default for this model.</FieldDescription>
					</FieldContent>
					<Skeleton className="h-8 w-full" />
				</Field>
				<Field orientation="horizontal">
					<Skeleton className="h-7 w-16" />
				</Field>
			</FieldGroup>
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
			onSave={(values) => save.mutate(values)}
			onReset={() => reset.mutate()}
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
	onSave: (values: ModelSettingsFormValues) => void;
	onReset: () => void;
}) {
	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: perModelOptionsSchema },
		onSubmit: async ({ value }) => onSave(value),
	});

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
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
