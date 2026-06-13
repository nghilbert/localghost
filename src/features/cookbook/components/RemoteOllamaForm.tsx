import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod/v4";
import { ConnectionTestAlert } from "#/components/ConnectionTestAlert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup } from "#/components/ui/field";
import { registerRemoteOllama, testRemoteOllama } from "#/features/cookbook/lib/cookbook.functions";
import { RemoteHostSchema } from "#/features/cookbook/lib/remote-host";
import { useAppForm } from "#/hooks/use-app-form";

const RemoteFormSchema = z.object({
	host: RemoteHostSchema.shape.host,
	port: z
		.string()
		.regex(/^\d+$/, "Port must be a number")
		.refine((value) => Number(value) >= 1 && Number(value) <= 65535, "Port must be 1–65535"),
});

export function RemoteOllamaForm({ onBack }: { onBack: () => void }) {
	const queryClient = useQueryClient();

	const testMutation = useMutation({
		mutationFn: (data: { host: string; port: number }) => testRemoteOllama({ data }),
	});

	const connectMutation = useMutation({
		mutationFn: (data: { host: string; port: number }) => registerRemoteOllama({ data }),
		onSuccess: () => {
			toast.success("Connected to remote Ollama");
			queryClient.invalidateQueries({ queryKey: ["cookbook-status"] });
			queryClient.invalidateQueries({ queryKey: ["endpoints"] });
		},
		onError: (error) => toast.error("Could not connect", { description: error.message }),
	});

	const form = useAppForm({
		defaultValues: { host: "", port: "11434" },
		validators: { onDynamic: RemoteFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value }) =>
			connectMutation.mutateAsync({ host: value.host.trim(), port: Number(value.port) }),
	});

	function handleTest() {
		const parsed = RemoteFormSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.error("Enter a valid host and port first");
			return;
		}
		testMutation.mutate({ host: parsed.data.host, port: Number(parsed.data.port) });
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to Ollama on another machine</CardTitle>
				<CardDescription>
					Enter the address of the machine running Ollama — for example a homelab server. Make sure
					Ollama listens on the network there (OLLAMA_HOST=0.0.0.0).
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
							<form.AppField name="host">
								{(field) => (
									<field.InputField
										label="Host"
										placeholder="192.168.1.50"
										description="Hostname or IP address — no http:// or port."
									/>
								)}
							</form.AppField>
							<form.AppField name="port">
								{(field) => <field.InputField label="Port" inputMode="numeric" />}
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
