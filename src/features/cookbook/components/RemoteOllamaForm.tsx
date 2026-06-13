import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConnectionTestAlert } from "#/components/ConnectionTestAlert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { registerRemoteOllama, testRemoteOllama } from "#/features/cookbook/lib/cookbook.functions";
import { OllamaUrlSchema } from "#/features/cookbook/lib/ollama-url";
import { useAppForm } from "#/hooks/use-app-form";

export function RemoteOllamaForm({ onBack }: { onBack: () => void }) {
	const queryClient = useQueryClient();

	const testMutation = useMutation({
		mutationFn: (url: string) => testRemoteOllama({ data: { url } }),
	});

	const connectMutation = useMutation({
		mutationFn: (url: string) => registerRemoteOllama({ data: { url } }),
		onSuccess: () => {
			toast.success("Connected to Ollama");
			queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
		},
		onError: (error) => toast.error("Could not connect", { description: error.message }),
	});

	const form = useAppForm({
		defaultValues: { url: "" },
		validators: { onDynamic: OllamaUrlSchema },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value }) => connectMutation.mutateAsync(value.url),
	});

	function handleTest() {
		const parsed = OllamaUrlSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.error("Enter a valid URL first");
			return;
		}
		testMutation.mutate(parsed.data.url);
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

							{testMutation.data && (
								<ConnectionTestAlert
									ok={testMutation.data.reachable}
									title={testMutation.data.reachable ? "Connection works" : "Connection failed"}
									description={
										testMutation.data.reachable
											? `Found ${testMutation.data.modelCount} installed model${testMutation.data.modelCount === 1 ? "" : "s"}.`
											: "Check the address and that Ollama accepts network connections."
									}
								/>
							)}

							<Field orientation="horizontal">
								<form.SubmitButton>Connect</form.SubmitButton>
								<Button
									type="button"
									variant="outline"
									disabled={testMutation.isPending}
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
