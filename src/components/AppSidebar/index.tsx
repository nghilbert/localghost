import { Link, type LinkProps } from "@tanstack/react-router";
import { CopyrightIcon, HomeIcon, type LucideIcon } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { APP_NAME, COPYRIGHT_STATEMENT } from "#/lib/constants";
import { AuthMenu } from "./AuthMenu";

type NavLink = { label: string; to: Exclude<LinkProps["to"], undefined>; Icon: LucideIcon };
const navLinks: NavLink[] = [{ label: "Home", to: "/", Icon: HomeIcon }];

export function AppSidebar() {
	return (
		<Sidebar variant="floating" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
						<span className="mr-auto font-semibold truncate">{APP_NAME}</span>
						<SidebarTrigger variant="default" size="icon-lg" />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{navLinks.map((link) => (
								<SidebarMenuItem key={String(link.to)}>
									<SidebarMenuButton asChild tooltip={link.label}>
										<Link to={link.to}>
											<link.Icon />
											<span className="truncate">{link.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup className="mt-auto group-data-[collapsible=icon]:hidden">
					<footer className="text-center truncate">
						<small className="inline-flex items-center gap-1 text-muted-foreground">
							<CopyrightIcon size="1em" />
							{COPYRIGHT_STATEMENT}
						</small>
					</footer>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<AuthMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
