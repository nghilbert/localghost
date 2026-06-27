import { revalidateLogic } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { useSignOut } from "#/features/auth/hooks/use-sign-out";
import { userSettingsQueryOptions } from "#/features/settings/lib/user-settings.functions";
import { useAppForm } from "#/hooks/use-app-form";
import { useUpdateAccount } from "../hooks/use-update-account";
import { AccountFormSchema } from "../lib/schemas";

export function AccountTab() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const { data: settings } = useSuspenseQuery(userSettingsQueryOptions());

	const updateMutation = useUpdateAccount();
	const signOut = useSignOut();

	const form = useAppForm({
		defaultValues: { name: user?.name ?? "", systemPrompt: settings.systemPrompt ?? "" },
		validators: { onDynamic: AccountFormSchema },
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
