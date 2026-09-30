import { Link, useRouteContext } from "@tanstack/react-router";
import { LogOutIcon, PaletteIcon, SettingsIcon } from "lucide-react";
import { Avatar } from "#/components/ui/avatar";
import { Menu } from "#/components/ui/menu";
import { Sidebar } from "#/components/ui/sidebar";
import { useSignOut } from "#/features/account/hooks/use-sign-out";

function getFirstTwoInitials(fullName: string) {
	return fullName
		.split(" ")
		.map((name) => name[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

/** The signed-in user's menu, with settings and sign out. */
export function AuthMenu() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const signOut = useSignOut();

	return (
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Menu.Root>
					<Menu.Trigger render={<Sidebar.MenuButton size="lg" tooltip={user.name} />}>
						<Avatar.Root>
							<Avatar.Fallback>{getFirstTwoInitials(user.name)}</Avatar.Fallback>
						</Avatar.Root>
						<div className="flex flex-col leading-tight">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate text-xs text-muted-fg">{user.email}</span>
						</div>
					</Menu.Trigger>
					<Menu.Content side="top" align="start" className="min-w-56">
						<Menu.Group>
							<Menu.GroupLabel className="flex flex-col font-normal text-fg">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs text-muted-fg">{user.email}</span>
							</Menu.GroupLabel>
							<Menu.Separator />
							<Menu.LinkItem render={<Link to="/settings/appearance" />}>
								<PaletteIcon />
								Appearance
							</Menu.LinkItem>
							<Menu.LinkItem render={<Link to="/settings" />}>
								<SettingsIcon />
								Settings
							</Menu.LinkItem>
							<Menu.Item disabled={signOut.isPending} onClick={() => signOut.mutate()}>
								<LogOutIcon />
								{signOut.isPending ? "Signing out..." : "Sign out"}
							</Menu.Item>
						</Menu.Group>
					</Menu.Content>
				</Menu.Root>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	);
}
