import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { ConnectionTestAlert } from "#/components/ConnectionTestAlert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { useOllama } from "#/features/cookbook/hooks/use-ollama";
import { OllamaUrlSchema } from "#/features/cookbook/lib/ollama-url";
import { useAppForm } from "#/hooks/use-app-form";

export function RemoteOllamaForm({ onBack }: { onBack: () => void }) {
	const { connectRemote, testRemote } = useOllama();

	const form = useAppForm({
		defaultValues: { url: "" },
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
		testRemote.mutate(parsed.data.url);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to Ollama at a URL</CardTitle>
				<CardDescription>
					Point at an Ollama instance by URL — a homelab server, another machine, or a custom port.
					Make sure Ollama listens on the network there (OLLAMA_HOST=0.0.0.0).
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						form.handleSubmit();
					}}
				>
					<form.AppForm>
						<FieldGroup>
							<form.AppField name="url">
								{(field) => (
									<field.InputField
										label="Ollama URL"
										placeholder="http://192.168.1.50:11434"
										description="Full URL including http:// or https:// and the port."
									/>
								)}
							</form.AppField>

							{testRemote.data && (
								<ConnectionTestAlert
									ok={testRemote.data.reachable}
									title={testRemote.data.reachable ? "Connection works" : "Connection failed"}
									description={
										testRemote.data.reachable
											? `Found ${testRemote.data.modelCount} installed model${testRemote.data.modelCount === 1 ? "" : "s"}.`
											: "Check the address and that Ollama accepts network connections."
									}
								/>
							)}

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
						</FieldGroup>
					</form.AppForm>
				</form>
			</CardContent>
		</Card>
	);
}
