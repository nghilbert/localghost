import { revalidateLogic } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { authClient } from "#/features/auth/lib/auth-client";
import { useAppForm } from "#/hooks/use-app-form";

const ProfileSchema = z.object({
	name: z.string().trim().min(1, "Name is required"),
});

export function AccountTab() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });

	const form = useAppForm({
		defaultValues: { name: user?.name ?? "" },
		validators: { onDynamic: ProfileSchema },
		validationLogic: revalidateLogic(),
		onSubmit: async ({ value }) => {
			const { error } = await authClient.updateUser({ name: value.name.trim() });
			if (error) {
				toast.error("Failed to update profile");
				return;
			}
			queryClient.invalidateQueries({ queryKey: ["session"] });
			toast.success("Profile updated");
		},
	});

	const signOutMutation = useMutation({
		mutationFn: () => authClient.signOut(),
		onSuccess: () => navigate({ to: "/sign-in" }),
	});

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							form.handleSubmit();
						}}
					>
						<form.AppForm>
							<FieldGroup className="gap-3">
								<form.AppField name="name">
									{(field) => <field.InputField label="Name" />}
								</form.AppField>
								<Field orientation="horizontal">
									<form.SubmitButton size="sm">Save</form.SubmitButton>
								</Field>
							</FieldGroup>
						</form.AppForm>
					</form>
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
						onClick={() => signOutMutation.mutate()}
						disabled={signOutMutation.isPending}
					>
						{signOutMutation.isPending ? "Signing out…" : "Sign out"}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
