import { Link, type LinkProps, useRouterState } from "@tanstack/react-router";
import {
	BookOpenIcon,
	LibraryIcon,
	type LucideIcon,
	MessageSquarePlusIcon,
	SettingsIcon,
} from "lucide-react";
import { useConversations } from "#/features/chat/hooks/use-conversations";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "../ui/sidebar";

type NavItem = { label: string; to: LinkProps["to"]; NavIcon: LucideIcon };
const NAV_ITEMS = [
	{ label: "Library", to: "/library", NavIcon: LibraryIcon },
	{ label: "Skills", to: "/skills", NavIcon: BookOpenIcon },
	{ label: "Settings", to: "/settings", NavIcon: SettingsIcon },
] as const satisfies NavItem[];

export function PageNav() {
	const location = useRouterState({ select: (s) => s.location.pathname });
	const { createConversation } = useConversations();

	return (
		<SidebarGroup>
			<SidebarGroupContent>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							tooltip="New chat"
							onClick={() => createConversation.mutate()}
							disabled={createConversation.isPending}
						>
							<MessageSquarePlusIcon size={15} />
							<span>Chat</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
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
