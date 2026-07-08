import { revalidateLogic } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { userSettingsQueryOptions } from "#/entities/user-settings/user-settings.functions";
import { useSignOut } from "#/features/auth/hooks/use-sign-out";
import { useUpdateAccount } from "#/features/update-account/hooks/use-update-account";
import { accountFormSchema } from "#/features/update-account/lib/schemas";
import { useAppForm } from "#/shared/hooks/use-app-form";
import { Button } from "#/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/ui/card";
import { Field, FieldLabel } from "#/shared/ui/field";

export function AccountTab() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const { data: settings } = useSuspenseQuery(userSettingsQueryOptions());

	const updateMutation = useUpdateAccount();
	const signOut = useSignOut();

	const form = useAppForm({
		defaultValues: { name: user?.name ?? "", systemPrompt: settings.systemPrompt ?? "" },
		validators: { onDynamic: accountFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await updateMutation.mutate({
				name: value.name.trim(),
				systemPrompt: value.systemPrompt,
				temperature: settings.temperature,
			});
		},
	});

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<form.AppForm>
						<form.SubmitForm className="gap-3">
							<form.AppField name="name">
								{(field) => <field.InputField label="Name" />}
							</form.AppField>

							<form.AppField name="systemPrompt">
								{(field) => (
									<field.TextareaField
										label="System prompt"
										description="Instructions prepended to every chat."
										placeholder="You are a helpful assistant…"
										rows={4}
										fieldOrientation="vertical"
									/>
								)}
							</form.AppField>

							<form.SubmitButton size="sm">Save</form.SubmitButton>
						</form.SubmitForm>
					</form.AppForm>
					<Field>
						<FieldLabel>Email</FieldLabel>
						<span className="text-sm">{user?.email}</span>
					</Field>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Session</CardTitle>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						size="sm"
						onClick={() => signOut.mutate()}
						disabled={signOut.isPending}
					>
						{signOut.isPending ? "Signing out…" : "Sign out"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
