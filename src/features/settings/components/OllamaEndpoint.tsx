import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Field, FieldDescription, FieldLegend, FieldSet } from "#/components/ui/field";
import { useOllama } from "#/features/library/hooks/use-ollama";
import { libraryStatusQueryOptions } from "#/features/library/lib/library.functions";
import { OllamaUrlSchema } from "#/features/library/lib/ollama/url";
import { useAppForm } from "#/hooks/use-app-form";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";

/**
 * The built-in local Ollama endpoint: read-only reachability status plus an editable
 * URL for pointing at a remote or non-default install. The row itself is managed by
 * Library discovery, so this never offers to add or delete it.
 */
export function OllamaEndpoint() {
	const { data: status } = useQuery({
		...libraryStatusQueryOptions(),
		refetchInterval: (query) => (query.state.data?.found ? 30_000 : 5_000),
	});
	const currentUrl = status?.ollamaUrl ?? DEFAULT_OLLAMA_URL;

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
				Built in — no setup needed when Ollama runs locally. Point it at another host or port below
				(e.g. a homelab server); Ollama must listen on the network there (OLLAMA_HOST=0.0.0.0).
			</FieldDescription>
			<OllamaUrlForm key={currentUrl} currentUrl={currentUrl} />
		</FieldSet>
	);
}

function OllamaUrlForm({ currentUrl }: { currentUrl: string }) {
	const { connectRemote, testRemote } = useOllama();

	const form = useAppForm({
		defaultValues: { url: currentUrl },
		validators: { onDynamic: OllamaUrlSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await connectRemote.mutate(value.url);
		},
	});

	function handleTest() {
		const parsed = OllamaUrlSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.error("Enter a valid URL first");
			return;
		}
		testRemote.reset();
		testRemote.mutate(parsed.data.url, {
			onSuccess: (result) => {
				if (result.reachable) {
					toast.success(`Connection works — ${result.modelCount} models available`);
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
