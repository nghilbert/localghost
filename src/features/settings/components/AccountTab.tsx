import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Field, FieldLabel } from "#/components/ui/field";
import { authClient } from "#/features/auth/lib/auth-client";
import { UpdateProfileForm } from "#/features/settings/components/UpdateProfileForm";

export function AccountTab() {
	const navigate = useNavigate();
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });

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
					<UpdateProfileForm />
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
