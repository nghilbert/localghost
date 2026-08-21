import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import { BotIcon, LibraryIcon, type LucideIcon, MessageCirclePlusIcon } from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "#/shared/components/ui/sidebar";

type NavItem = {
	label: string;
	to: LinkProps["to"];
	NavIcon: LucideIcon;
	/** Path prefixes that count as this section, beyond `to` itself. */
	matches: readonly string[];
};
const NAV_ITEMS = [
	{ label: "Chat", to: "/new", NavIcon: MessageCirclePlusIcon, matches: ["/new", "/chat"] },
	{ label: "Code agent", to: "/agent", NavIcon: BotIcon, matches: ["/agent"] },
	{ label: "Library", to: "/library", NavIcon: LibraryIcon, matches: ["/library"] },
] as const satisfies NavItem[];

export function PageNav() {
	const location = useRouterState({ select: (s) => s.location.pathname });

	return (
		<SidebarGroup>
			<SidebarGroupContent>
				<SidebarMenu>
					{NAV_ITEMS.map(({ to, label, NavIcon, matches }) => (
						<SidebarMenuItem key={to}>
							<SidebarMenuButton
								render={<Link to={to} />}
								isActive={matches.some((prefix) => location.startsWith(prefix))}
								tooltip={label}
							>
								<NavIcon />
								<span>{label}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
