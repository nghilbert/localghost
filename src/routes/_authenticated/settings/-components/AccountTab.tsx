import { revalidateLogic } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { userSettingsQueryOptions } from "#/entities/user-settings/user-settings.functions";
import { useSignOut } from "#/features/auth/hooks/use-sign-out";
import { useAppForm } from "#/shared/hooks/use-app-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "#/shared/ui/alert-dialog";
import { Button } from "#/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/ui/card";
import { Field, FieldLabel } from "#/shared/ui/field";
import { Input } from "#/shared/ui/input";
import { useChangePassword } from "../-hooks/use-change-password";
import { useDeleteAccount } from "../-hooks/use-delete-account";
import { useUpdateAccount } from "../-hooks/use-update-account";
import { accountFormSchema, changePasswordFormSchema } from "../-lib/schemas";
import { BackupCard } from "./BackupCard";

export function AccountTab() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const { data: settings } = useSuspenseQuery(userSettingsQueryOptions());

	const updateMutation = useUpdateAccount();
	const signOut = useSignOut();
	const changePasswordMutation = useChangePassword();
	const deleteAccountMutation = useDeleteAccount();
	const [deleteConfirmText, setDeleteConfirmText] = useState("");

	const form = useAppForm({
		defaultValues: {
			name: user?.name ?? "",
			systemPrompt: settings.systemPrompt ?? "",
			temperature: settings.temperature,
		},
		validators: { onDynamic: accountFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await updateMutation.mutate({
				name: value.name.trim(),
				systemPrompt: value.systemPrompt,
				temperature: value.temperature,
			});
		},
	});

	const passwordForm = useAppForm({
		defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
		validators: { onDynamic: changePasswordFormSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			await changePasswordMutation.mutate(
				{ currentPassword: value.currentPassword, newPassword: value.newPassword },
				{ onSuccess: () => passwordForm.reset() },
			);
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

							<form.AppField name="temperature">
								{(field) => (
									<field.SliderField
										label={`Temperature (${field.state.value.toFixed(1)})`}
										description="Higher values make replies more random; lower values more focused."
										fieldOrientation="vertical"
										min={0}
										max={2}
										step={0.1}
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

			<BackupCard />

			<Card>
				<CardHeader>
					<CardTitle>Security</CardTitle>
				</CardHeader>
				<CardContent>
					<passwordForm.AppForm>
						<passwordForm.SubmitForm className="gap-3">
							<passwordForm.AppField name="currentPassword">
								{(field) => <field.PasswordField label="Current password" />}
							</passwordForm.AppField>

							<passwordForm.AppField name="newPassword">
								{(field) => <field.PasswordField label="New password" />}
							</passwordForm.AppField>

							<passwordForm.AppField name="confirmPassword">
								{(field) => <field.PasswordField label="Confirm new password" />}
							</passwordForm.AppField>

							<passwordForm.SubmitButton size="sm">Change password</passwordForm.SubmitButton>
						</passwordForm.SubmitForm>
					</passwordForm.AppForm>
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

			<Card>
				<CardHeader>
					<CardTitle>Danger zone</CardTitle>
				</CardHeader>
				<CardContent>
					<AlertDialog
						onOpenChange={(open) => {
							if (!open) setDeleteConfirmText("");
						}}
					>
						<AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
							Delete account
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete your account?</AlertDialogTitle>
								<AlertDialogDescription>
									This permanently deletes your account and all conversations, memories, and
									endpoints. This cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<Field>
								<FieldLabel htmlFor="delete-confirm-email">
									Type your email ({user?.email}) to confirm
								</FieldLabel>
								<Input
									id="delete-confirm-email"
									data-testid="delete-account-confirm-input"
									value={deleteConfirmText}
									onChange={(event) => setDeleteConfirmText(event.target.value)}
									autoComplete="off"
								/>
							</Field>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									variant="destructive"
									disabled={deleteConfirmText !== user?.email || deleteAccountMutation.isPending}
									onClick={() => deleteAccountMutation.mutate()}
								>
									{deleteAccountMutation.isPending ? "Deleting…" : "Delete account"}
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardContent>
			</Card>
		</div>
	);
}
