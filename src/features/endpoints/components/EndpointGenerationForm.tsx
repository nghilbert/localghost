import { SlidersHorizontalIcon } from "lucide-react";
import { useEndpoints } from "#/features/endpoints/hooks/use-endpoints";
import type { getEndpoints } from "#/features/endpoints/lib/endpoint.functions";
import { ollamaOptionsSchema } from "#/features/endpoints/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

type Endpoint = Awaited<ReturnType<typeof getEndpoints>>[number];

const AUTO = "Auto (Ollama default)";

/**
 * Edits an Ollama endpoint's generation settings. Every field is optional — a blank
 * means "use Ollama's own default" — so the curated values override only where set.
 * Fields outside the rendered set that already live in the stored blob are preserved.
 */
export function EndpointGenerationForm({ endpoint }: { endpoint: Endpoint }) {
	const { updateEndpoint } = useEndpoints();
	const parsed = ollamaOptionsSchema.safeParse(endpoint.options);
	const saved = parsed.success ? parsed.data : {};

	const form = useAppForm({
		defaultValues: {
			num_ctx: saved.num_ctx,
			num_predict: saved.num_predict,
			temperature: saved.temperature,
			top_k: saved.top_k,
			top_p: saved.top_p,
			repeat_penalty: saved.repeat_penalty,
			seed: saved.seed,
			mirostat: saved.mirostat,
		},
		onSubmit: ({ value }) => {
			updateEndpoint.mutate({ id: endpoint.id, data: { options: { ...saved, ...value } } });
		},
	});

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
				<form.AppField name="num_ctx">
					{(field) => (
						<field.NumberField
							label="Context window"
							description="Tokens of context the model keeps (num_ctx)."
							placeholder={AUTO}
							min={1}
						/>
					)}
				</form.AppField>
				<form.AppField name="num_predict">
					{(field) => (
						<field.NumberField
							label="Max output tokens"
							description="Cap on generated tokens; -1 is unlimited (num_predict)."
							placeholder={AUTO}
						/>
					)}
				</form.AppField>
				<form.AppField name="temperature">
					{(field) => (
						<field.NumberField label="Temperature" placeholder={AUTO} min={0} step={0.1} />
					)}
				</form.AppField>
				<form.AppField name="top_k">
					{(field) => <field.NumberField label="Top K" placeholder={AUTO} min={0} />}
				</form.AppField>
				<form.AppField name="top_p">
					{(field) => (
						<field.NumberField label="Top P" placeholder={AUTO} min={0} max={1} step={0.05} />
					)}
				</form.AppField>
				<form.AppField name="repeat_penalty">
					{(field) => (
						<field.NumberField label="Repeat penalty" placeholder={AUTO} min={0} step={0.1} />
					)}
				</form.AppField>
				<form.AppField name="seed">
					{(field) => (
						<field.NumberField
							label="Seed"
							description="Fixes sampling for reproducible output."
							placeholder={AUTO}
						/>
					)}
				</form.AppField>
				<form.AppField name="mirostat">
					{(field) => (
						<field.NumberField
							label="Mirostat"
							description="Perplexity control: 0 off, 1 or 2 to enable."
							placeholder={AUTO}
							min={0}
							max={2}
						/>
					)}
				</form.AppField>

				<form.SubmitButton>
					<SlidersHorizontalIcon />
					Save settings
				</form.SubmitButton>
			</form.SubmitForm>
		</form.AppForm>
	);
}
