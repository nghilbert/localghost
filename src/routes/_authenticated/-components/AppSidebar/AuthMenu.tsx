import { Link, useRouteContext } from "@tanstack/react-router";
import { LogOutIcon, PaletteIcon, SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "#/shared/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/shared/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "#/shared/components/ui/sidebar";
import { useSignOut } from "#/shared/hooks/use-sign-out";

function getFirstTwoInitials(fullName: string) {
	return fullName
		.split(" ")
		.map((name) => name[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function AuthMenu() {
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });
	const signOut = useSignOut();

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger render={<SidebarMenuButton size="lg" tooltip={user.name} />}>
						<Avatar>
							<AvatarFallback>{getFirstTwoInitials(user.name)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col leading-tight">
							<span className="truncate font-medium">{user.name}</span>
							<span className="truncate text-xs text-muted-foreground">{user.email}</span>
						</div>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="min-w-56">
						<DropdownMenuGroup>
							<DropdownMenuLabel className="font-normal">
								<div className="flex flex-col">
									<span className="truncate font-medium">{user.name}</span>
									<span className="truncate text-xs text-muted-foreground">{user.email}</span>
								</div>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							<DropdownMenuItem render={<Link to="/settings" search={{ tab: "appearance" }} />}>
								<PaletteIcon />
								Appearance
							</DropdownMenuItem>
							<DropdownMenuItem render={<Link to="/settings" />}>
								<SettingsIcon />
								Settings
							</DropdownMenuItem>
							<DropdownMenuItem disabled={signOut.isPending} onClick={() => signOut.mutate()}>
								<LogOutIcon />
								{signOut.isPending ? "Signing out…" : "Sign out"}
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
