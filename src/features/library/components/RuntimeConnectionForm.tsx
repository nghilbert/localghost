import { useAppForm } from "#/components/form/use-app-form";
import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/toast";
import { useConnectRuntime } from "#/features/library/hooks/use-connect-runtime";
import { useTestRuntime } from "#/features/library/hooks/use-test-runtime";
import { llamacppUrlSchema } from "#/lib/llamacpp/url";

type RuntimeConnectionFormProps = {
	defaultUrl: string;
	submitLabel: string;
};

/** Configures and tests a llama.cpp runtime URL. */
export function RuntimeConnectionForm({ defaultUrl, submitLabel }: RuntimeConnectionFormProps) {
	const connectRemote = useConnectRuntime();
	const testRemote = useTestRuntime();
	const form = useAppForm({
		defaultValues: { url: defaultUrl },
		validators: { onDynamic: llamacppUrlSchema },
		onSubmit: ({ value }) => connectRemote.mutateAsync({ url: value.url }),
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
		<form.AppForm>
			<form.Form className="gap-3">
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

				<div className="flex items-center gap-2">
					<form.SubmitButton>{submitLabel}</form.SubmitButton>
					<Button
						type="button"
						color="neutral"
						variant="outlined"
						disabled={testRemote.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
				</div>
			</form.Form>
		</form.AppForm>
	);
}
