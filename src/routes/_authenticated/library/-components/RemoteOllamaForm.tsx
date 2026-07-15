import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { Field } from "#/shared/components/ui/field";
import { useOllama } from "#/shared/domain/model/use-ollama";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { ollamaUrlSchema } from "#/shared/lib/ollama/url";

export function RemoteOllamaForm({ onBack }: { onBack: () => void }) {
	const { connectRemote, testRemote } = useOllama();

	const form = useAppForm({
		defaultValues: { url: "" },
		validators: { onDynamic: ollamaUrlSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await connectRemote.mutate({ url: value.url });
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
		<Card>
			<CardHeader>
				<CardTitle>Connect to Ollama at a URL</CardTitle>
				<CardDescription>
					Point at an Ollama instance by URL: a homelab server, another machine, or a custom port.
					Make sure Ollama listens on the network there (OLLAMA_HOST=0.0.0.0).
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form.AppForm>
					<form.SubmitForm>
						<form.AppField name="url">
							{(field) => (
								<field.InputField
									label="Ollama URL"
									placeholder="http://192.168.1.50:11434"
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
							<form.SubmitButton>Connect</form.SubmitButton>
							<Button
								type="button"
								variant="outline"
								disabled={testRemote.isPending}
								onClick={handleTest}
							>
								Test connection
							</Button>
							<Button type="button" variant="ghost" onClick={onBack}>
								Back
							</Button>
						</Field>
					</form.SubmitForm>
				</form.AppForm>
			</CardContent>
		</Card>
	);
}
