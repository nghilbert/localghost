import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { Button } from "#/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/shared/components/ui/card";
import { userSettingsQueryOptions } from "#/shared/domain/user-settings/user-settings.functions";
import { useSignOut } from "#/shared/hooks/use-sign-out";
import { BackupCard } from "./BackupCard";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { ProfileForm } from "./ProfileForm";

export function AccountTab() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const { data: settings } = useSuspenseQuery(userSettingsQueryOptions());
	const signOut = useSignOut();
	const email = user?.email ?? "";

	return (
		<div className="space-y-4">
			<ProfileForm
				name={user?.name ?? ""}
				email={email}
				systemPrompt={settings.systemPrompt ?? ""}
				temperature={settings.temperature}
			/>

			<BackupCard />
			<ChangePasswordForm />

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
					<DeleteAccountDialog email={email} />
				</CardContent>
			</Card>
		</div>
	);
}
