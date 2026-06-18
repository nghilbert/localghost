import { revalidateLogic } from "@tanstack/react-form";
import { useRouteContext } from "@tanstack/react-router";
import { Field } from "#/components/ui/field";
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
		<form.AppForm>
			<form.Shell className="gap-3">
				<form.AppField name="name">{(field) => <field.InputField label="Name" />}</form.AppField>
				<form.FormError>{updateMutation.error?.message}</form.FormError>
				<Field orientation="horizontal">
					<form.SubmitButton size="sm">Save</form.SubmitButton>
				</Field>
			</form.Shell>
		</form.AppForm>
	);
}
