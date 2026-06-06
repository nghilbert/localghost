import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { LogOutIcon, SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "#/components/ui/sidebar";
import { authQueryOptions } from "#/features/auth/lib/auth.functions";
import { authClient } from "#/features/auth/lib/auth-client";

function getFirstTwoInitials(fullName: string) {
	return fullName
		.split(" ")
		.map((name) => name[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export function AuthMenu() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const {
		auth: { user },
	} = useRouteContext({ from: "/_authenticated" });

	async function handleSignOut() {
		await authClient.signOut();
		await queryClient.invalidateQueries(authQueryOptions());
		navigate({ to: "/sign-in" });
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton size="lg" tooltip={user.name}>
							<Avatar>
								<AvatarFallback>{getFirstTwoInitials(user.name)}</AvatarFallback>
							</Avatar>
							<div className="flex flex-col leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="top" align="start" className="min-w-56">
						<DropdownMenuLabel className="font-normal">
							<div className="flex flex-col">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs text-muted-foreground">{user.email}</span>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link to="/settings">
								<SettingsIcon />
								Settings
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOutIcon />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
