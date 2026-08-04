import { revalidateLogic } from "@tanstack/react-form";
import { Button } from "#/shared/components/ui/button";
import { Field } from "#/shared/components/ui/field";
import { toast } from "#/shared/components/ui/toast";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { llamacppUrlSchema } from "#/shared/lib/llamacpp/url";
import { useConnectRuntime, useTestRuntime } from "./use-model";

type RuntimeConnectionFormProps = {
	defaultUrl: string;
	submitLabel: string;
	onCancel?: () => void;
};

/** Configures and tests a llama.cpp runtime URL. */
export function RuntimeConnectionForm({
	defaultUrl,
	submitLabel,
	onCancel,
}: RuntimeConnectionFormProps) {
	const connectRemote = useConnectRuntime();
	const testRemote = useTestRuntime();
	const form = useAppForm({
		defaultValues: { url: defaultUrl },
		validators: { onDynamic: llamacppUrlSchema },
		validationLogic: revalidateLogic(),
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
			<form.SubmitForm className="gap-3">
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
					<form.SubmitButton data-testid="runtime-connect-submit">{submitLabel}</form.SubmitButton>
					<Button
						type="button"
						variant="outline"
						data-testid="runtime-test-button"
						disabled={testRemote.isPending}
						onClick={handleTest}
					>
						Test connection
					</Button>
					{onCancel && (
						<Button
							type="button"
							variant="ghost"
							data-testid="runtime-cancel-button"
							onClick={onCancel}
						>
							Back
						</Button>
					)}
				</Field>
			</form.SubmitForm>
		</form.AppForm>
	);
}
