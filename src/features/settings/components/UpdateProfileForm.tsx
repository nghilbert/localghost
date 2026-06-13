import { revalidateLogic } from "@tanstack/react-form";
import { useRouteContext } from "@tanstack/react-router";
import { Field, FieldGroup } from "#/components/ui/field";
import { useUpdateProfile } from "#/features/settings/hooks/use-update-profile";
import { ProfileFormSchema } from "#/features/settings/lib/schemas";
import { useAppForm } from "#/hooks/use-app-form";

export function UpdateProfileForm() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const updateMutation = useUpdateProfile();

	const form = useAppForm({
		defaultValues: { name: user?.name ?? "" },
		validators: { onDynamic: ProfileFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await updateMutation.mutate(value.name.trim());
		},
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				form.handleSubmit();
			}}
		>
			<form.AppForm>
				<FieldGroup className="gap-3">
					<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>
					<form.FormError>{updateMutation.error?.message}</form.FormError>
					<Field orientation="horizontal">
						<form.SubmitButton size="sm">Save</form.SubmitButton>
					</Field>
				</FieldGroup>
			</form.AppForm>
		</form>
	);
}
