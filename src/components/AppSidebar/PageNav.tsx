import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { LibraryIcon, type LucideIcon, MessageCirclePlusIcon } from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "../ui/sidebar";

type NavItem = { label: string; to: LinkProps["to"]; NavIcon: LucideIcon };
const NAV_ITEMS = [
	{ label: "Chat", to: "/new", NavIcon: MessageCirclePlusIcon },
	{ label: "Library", to: "/library", NavIcon: LibraryIcon },
] as const satisfies NavItem[];

export function PageNav() {
	const location = useRouterState({ select: (s) => s.location.pathname });

	return (
		<SidebarGroup>
			<SidebarGroupContent>
				<SidebarMenu>
					{NAV_ITEMS.map(({ to, label, NavIcon }) => (
						<SidebarMenuItem key={to}>
							<SidebarMenuButton asChild isActive={location.startsWith(to)} tooltip={label}>
								<Link to={to}>
									<NavIcon />
									<span>{label}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
