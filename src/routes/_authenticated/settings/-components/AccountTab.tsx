import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { SettingsSection } from "#/components/layout/SettingsSection";
import { Button } from "#/components/ui/button";
import { accountQueries } from "#/features/account/account.queries";
import { ChangePasswordForm } from "#/features/account/components/ChangePasswordForm";
import { DeleteAccountDialog } from "#/features/account/components/DeleteAccountDialog";
import { ProfileForm } from "#/features/account/components/ProfileForm";
import { useSignOut } from "#/features/account/hooks/use-sign-out";
import { BackupCard } from "#/features/backup/components/BackupCard";

/** Profile, backup, password, session, and account deletion. */
export function AccountTab() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const { data: settings } = useSuspenseQuery(accountQueries.settings());
	const signOut = useSignOut();
	const email = user?.email ?? "";

	return (
		<>
			<ProfileForm
				name={user?.name ?? ""}
				email={email}
				systemPrompt={settings.systemPrompt ?? ""}
				temperature={settings.temperature}
			/>

			<BackupCard />
			<ChangePasswordForm />

			<SettingsSection title="Session">
				<div>
					<Button
						color="danger"
						variant="soft"
						size="sm"
						onClick={() => signOut.mutate()}
						disabled={signOut.isPending}
					>
						{signOut.isPending ? "Signing out..." : "Sign out"}
					</Button>
				</div>
			</SettingsSection>

			<SettingsSection title="Danger zone">
				<div>
					<DeleteAccountDialog email={email} />
				</div>
			</SettingsSection>
		</>
	);
}
