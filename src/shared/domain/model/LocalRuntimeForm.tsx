import { revalidateLogic } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod/v4";
import { Badge } from "#/shared/components/ui/badge";
import { Button } from "#/shared/components/ui/button";
import { Field, FieldDescription, FieldLegend, FieldSet } from "#/shared/components/ui/field";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { llamacppUrlSchema } from "#/shared/lib/llamacpp/url";
import { libraryStatusQueryOptions } from "./model.functions";
import { useRuntime } from "./use-runtime";

const DEFAULT_RUNTIME_URL = "http://localhost:8080";

/**
 * The built-in local llama.cpp endpoint: read-only reachability status plus an
 * editable URL for pointing at a remote or non-default install. The row itself
 * is managed by Library discovery, so this never offers to add or delete it.
 */
export function LocalRuntimeForm() {
	const { data: status } = useQuery(libraryStatusQueryOptions());
	const currentUrl = status?.runtimeUrl ?? DEFAULT_RUNTIME_URL;

	return (
		<FieldSet>
			<FieldLegend className="flex items-center gap-2">
				Local llama.cpp
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
				Built in, no setup needed when llama-server runs locally. Point it at another host or port
				below (e.g. a homelab server); llama-server must listen on the network there (--host
				0.0.0.0).
			</FieldDescription>
			<RuntimeConnectionForm key={currentUrl} currentUrl={currentUrl} />
		</FieldSet>
	);
}

function RuntimeConnectionForm({ currentUrl }: { currentUrl: string }) {
	const { connectRemote, testRemote } = useRuntime();

	const defaultValues: z.input<typeof llamacppUrlSchema> = { url: currentUrl };
	const form = useAppForm({
		defaultValues,
		validators: { onDynamic: llamacppUrlSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await connectRemote.mutate({ url: value.url });
		},
	});

	function handleTest() {
		const parsed = llamacppUrlSchema.safeParse(form.state.values);
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
							label="llama.cpp URL"
							placeholder={DEFAULT_RUNTIME_URL}
							description="Full URL including http:// or https:// and the port."
						/>
					)}
				</form.AppField>

				<form.FormError>
					{testRemote.data && !testRemote.data.reachable
						? `No llama.cpp instance is responding at ${form.state.values.url}`
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
