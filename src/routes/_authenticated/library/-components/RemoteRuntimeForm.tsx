import { revalidateLogic } from "@tanstack/react-form";
import { Button } from "#/shared/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/shared/components/ui/card";
import { Field } from "#/shared/components/ui/field";
import { toast } from "#/shared/components/ui/toast";
import { useRuntime } from "#/shared/domain/model/use-runtime";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { llamacppUrlSchema } from "#/shared/lib/llamacpp/url";

export function RemoteRuntimeForm({ onBack }: { onBack: () => void }) {
	const { connectRemote, testRemote } = useRuntime();

	const form = useAppForm({
		defaultValues: { url: "" },
		validators: { onDynamic: llamacppUrlSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await connectRemote.mutate({ url: value.url });
		},
	});

	function handleTest() {
		const parsed = llamacppUrlSchema.safeParse(form.state.values);
		if (!parsed.success) {
			toast.add({ title: "Enter a valid URL first", type: "error" });
			return;
		}
		testRemote.reset();
		testRemote.mutate(parsed.data.url, {
			onSuccess: (result) => {
				if (result.reachable) {
					toast.add({
						title: `Connection works: ${result.modelCount} models available`,
						type: "success",
					});
				}
			},
		});
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Connect to llama.cpp at a URL</CardTitle>
				<CardDescription>
					Point at a llama-server instance by URL: a homelab server, another machine, or a custom
					port. Make sure it listens on the network there (--host 0.0.0.0).
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form.AppForm>
					<form.SubmitForm>
						<form.AppField name="url">
							{(field) => (
								<field.InputField
									label="llama.cpp URL"
									placeholder="http://192.168.1.50:8080"
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
