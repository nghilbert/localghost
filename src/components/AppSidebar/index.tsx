import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpenIcon, LibraryIcon, MessageSquarePlusIcon, SettingsIcon } from "lucide-react";
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
import { ConversationList } from "#/features/chat/components/ConversationList";
import { useConversations } from "#/features/chat/hooks/use-conversations";
import { ModeToggle } from "#/features/theme/components/ModeToggle";
import { APP_NAME } from "#/lib/constants";
import { AuthMenu } from "./AuthMenu";

const NAV_ITEMS = [
	{ to: "/library", label: "Library", icon: LibraryIcon },
	{ to: "/skills", label: "Skills", icon: BookOpenIcon },
	{ to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function AppSidebar() {
	const location = useRouterState({ select: (s) => s.location.pathname });
	const { createConversation } = useConversations();

	return (
		<Sidebar variant="floating" collapsible="icon">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
						<span className="mr-auto font-semibold truncate group-data-[collapsible=icon]:hidden">
							{APP_NAME}
						</span>
						<SidebarTrigger variant="default" size="icon-lg" />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				{/* Page navigation */}
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
							{NAV_ITEMS.map(({ to, label, icon: Icon }) => (
								<SidebarMenuItem key={to}>
									<SidebarMenuButton asChild isActive={location.startsWith(to)} tooltip={label}>
										<Link to={to}>
											<Icon size={15} />
											<span>{label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				{/* Recent chats */}
				<ConversationList />
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<ModeToggle />
					</SidebarMenuItem>
				</SidebarMenu>
				<AuthMenu />
			</SidebarFooter>
		</Sidebar>
	);
}
