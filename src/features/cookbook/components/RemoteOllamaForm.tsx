import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod/v4";
import { ConnectionTestAlert } from "#/components/ConnectionTestAlert";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#/components/ui/collapsible";
import { Field, FieldGroup } from "#/components/ui/field";
import { registerRemoteOllama, testRemoteOllama } from "#/features/cookbook/lib/cookbook.functions";
import { buildOllamaUrlFromHost, HOSTNAME_OR_IP_REGEX } from "#/features/cookbook/lib/remote-host";
import { useAppForm } from "#/hooks/use-app-form";

/**
 * Host + port are the common path; the advanced "Full URL" field handles TLS,
 * reverse proxies, and subpaths that host+port can't express. A non-empty URL
 * overrides host+port.
 */
const RemoteFormSchema = z
	.object({
		host: z.string().trim(),
		port: z.string().trim(),
		url: z.string().trim(),
	})
	.superRefine((value, ctx) => {
		if (value.url) {
			if (!z.url().safeParse(value.url).success) {
				ctx.addIssue({
					code: "custom",
					path: ["url"],
					message: "Enter a valid URL, e.g. https://ollama.example.com",
				});
			}
			return;
		}
		if (!HOSTNAME_OR_IP_REGEX.test(value.host)) {
			ctx.addIssue({
				code: "custom",
				path: ["host"],
				message: "Enter a hostname or IP address — no http:// or port",
			});
		}
		const port = Number(value.port);
		if (!/^\d+$/.test(value.port) || port < 1 || port > 65535) {
			ctx.addIssue({ code: "custom", path: ["port"], message: "Port must be 1–65535" });
		}
	});

type RemoteFormValues = z.infer<typeof RemoteFormSchema>;

function resolveOllamaUrl(values: RemoteFormValues): string {
	const url = values.url.trim();
	if (url) return url;
	return buildOllamaUrlFromHost(values.host.trim(), Number(values.port));
}

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
		defaultValues: { host: "", port: "11434", url: "" },
		validators: { onDynamic: RemoteFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: ({ value }) => connectMutation.mutateAsync(resolveOllamaUrl(value)),
	});

	function handleTest() {
		const parsed = RemoteFormSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.error("Enter a valid host or URL first");
			return;
		}
		testMutation.mutate(resolveOllamaUrl(parsed.data));
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

							<Collapsible>
								<CollapsibleTrigger asChild>
									<Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
										<ChevronDownIcon />
										Advanced
									</Button>
								</CollapsibleTrigger>
								<CollapsibleContent className="pt-2">
									<form.AppField name="url">
										{(field) => (
											<field.InputField
												label="Full URL"
												placeholder="https://ollama.example.com"
												description="For TLS, reverse proxies, or subpaths. Overrides host and port."
											/>
										)}
									</form.AppField>
								</CollapsibleContent>
							</Collapsible>

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
