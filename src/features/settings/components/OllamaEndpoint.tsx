import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod/v4";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field";
import { useOllama } from "#/features/library/hooks/use-ollama";
import { libraryStatusQueryOptions } from "#/features/library/lib/library.functions";
import { ollamaConnectionFormSchema, ollamaUrlSchema } from "#/features/library/lib/ollama/url";
import { useAppForm } from "#/hooks/use-app-form";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

/**
 * The built-in local Ollama endpoint: read-only reachability status plus an editable
 * URL for pointing at a remote or non-default install. The row itself is managed by
 * Library discovery, so this never offers to add or delete it.
 */
export function OllamaEndpoint() {
	const { data: status } = useQuery(libraryStatusQueryOptions());
	const currentUrl = status?.ollamaUrl ?? DEFAULT_OLLAMA_URL;
	const currentNumCtx = status?.numCtx ?? null;

	return (
		<FieldSet>
			<FieldLegend className="flex items-center gap-2">
				Local Ollama
				{status?.found ? (
					<Badge variant="secondary" className="bg-success/10 text-success">
						<CheckCircle2Icon />
						{status.installedModels.length} models
					</Badge>
				) : (
					<Badge variant="secondary" className="bg-warning/10 text-warning">
						<CircleAlertIcon />
						Not found
					</Badge>
				)}
			</FieldLegend>
			<FieldDescription>
				Built in, no setup needed when Ollama runs locally. Point it at another host or port below
				(e.g. a homelab server); Ollama must listen on the network there (OLLAMA_HOST=0.0.0.0).
			</FieldDescription>
			<OllamaConnectionForm
				key={`${currentUrl}:${currentNumCtx}`}
				currentUrl={currentUrl}
				currentNumCtx={currentNumCtx}
			/>
		</FieldSet>
	);
}

function OllamaConnectionForm({
	currentUrl,
	currentNumCtx,
}: {
	currentUrl: string;
	currentNumCtx: number | null;
}) {
	const { connectRemote, testRemote } = useOllama();

	const defaultValues: z.input<typeof ollamaConnectionFormSchema> = {
		url: currentUrl,
		numCtx: currentNumCtx ?? undefined,
	};
	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: ollamaConnectionFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			// An emptied field sends null so a saved override is cleared, not kept.
			await connectRemote.mutate({ url: value.url, numCtx: value.numCtx ?? null });
		},
	});

	function handleTest() {
		const parsed = ollamaUrlSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.error("Enter a valid URL first");
			return;
		}
		testRemote.reset();
		testRemote.mutate(parsed.data.url, {
			onSuccess: (result) => {
				if (result.reachable) {
					toast.success(`Connection works: ${result.modelCount} models available`);
				}
			},
		});
	}

	return (
		<form.AppForm>
			<form.SubmitForm className="gap-3">
				<form.AppField name="url">
					{(field) => (
						<field.InputField
							label="Ollama URL"
							placeholder={DEFAULT_OLLAMA_URL}
							description="Full URL including http:// or https:// and the port."
						/>
					)}
				</form.AppField>

				<form.AppField name="numCtx">
					{(field) => (
						<field.NumberField
							label="Context length"
							placeholder="8192"
							description="Tokens of conversation the model can see (num_ctx). Higher values use more memory. Leave empty for the default of 8192."
						/>
					)}
				</form.AppField>

				<form.FormError>
					{testRemote.data && !testRemote.data.reachable
						? `No Ollama instance is responding at ${form.state.values.url}`
						: undefined}
				</form.FormError>

				<Field orientation="horizontal">
					<form.SubmitButton>Save</form.SubmitButton>
					<Button
						type="button"
						variant="outline"
						disabled={testRemote.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
